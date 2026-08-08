import {
  descreverSerie,
  diaEmBrasilia,
  diaSemanaEmBrasilia,
  diasEntreOcorrencias,
  frequenciaValida,
  horaValida,
  instanteEmBrasilia,
  primeiroDia,
  proximasOcorrencias,
  somarDias,
} from './recorrencia';

/**
 * Estes testes escrevem os instantes em UTC de propósito: é assim que eles
 * ficam no banco, e é onde o erro de fuso aparece. `new Date('2026-08-08')`
 * é meia-noite em UTC — 21h do dia 7 em Brasília.
 */

describe('conversão de dia e hora', () => {
  it('15:00 em Brasília é 18:00 em UTC', () => {
    expect(instanteEmBrasilia('2026-08-08', '15:00').toISOString()).toBe(
      '2026-08-08T18:00:00.000Z',
    );
  });

  it('aceita hora com e sem zero à esquerda', () => {
    expect(horaValida('9:30')).toBe(true);
    expect(horaValida('09:30')).toBe(true);
    expect(instanteEmBrasilia('2026-08-08', '9:30').toISOString()).toBe(
      '2026-08-08T12:30:00.000Z',
    );
  });

  it('recusa hora que não existe', () => {
    expect(horaValida('25:00')).toBe(false);
    expect(horaValida('10:75')).toBe(false);
    expect(horaValida('dez horas')).toBe(false);
    expect(horaValida('')).toBe(false);
  });

  it('o dia civil é o de Brasília, não o de UTC', () => {
    // 8 de agosto às 00:30 UTC ainda é dia 7 aqui.
    expect(diaEmBrasilia(new Date('2026-08-08T00:30:00Z'))).toBe('2026-08-07');
  });

  it('somar dia não escorrega de fuso', () => {
    expect(somarDias('2026-08-08', 7)).toBe('2026-08-15');
    expect(somarDias('2026-08-29', 7)).toBe('2026-09-05');
    expect(somarDias('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('o dia da semana também é lido em Brasília', () => {
    // 2026-08-08 é um sábado.
    expect(diaSemanaEmBrasilia(instanteEmBrasilia('2026-08-08', '10:00'))).toBe(6);
  });
});

describe('primeiro dia da série', () => {
  it('marcado numa quinta de manhã para "toda quinta às 15h", começa hoje', () => {
    const quintaDeManha = new Date('2026-08-06T13:00:00Z'); // 10h em Brasília
    expect(primeiroDia(4, '15:00', quintaDeManha)).toBe('2026-08-06');
  });

  it('marcado depois da hora, pula para a semana seguinte', () => {
    // Senão a primeira ocorrência nasceria no passado, e o dono desconfiaria
    // do sistema com razão.
    const quintaDeTarde = new Date('2026-08-06T21:00:00Z'); // 18h em Brasília
    expect(primeiroDia(4, '15:00', quintaDeTarde)).toBe('2026-08-13');
  });

  it('acha o próximo dia da semana pedido', () => {
    const quinta = new Date('2026-08-06T13:00:00Z');
    expect(primeiroDia(6, '10:00', quinta)).toBe('2026-08-08'); // sábado
    expect(primeiroDia(1, '10:00', quinta)).toBe('2026-08-10'); // segunda
  });
});

describe('próximas ocorrências', () => {
  const agora = new Date('2026-08-06T13:00:00Z'); // quinta, 10h em Brasília

  it('semanal cai sempre no mesmo dia e hora', () => {
    const datas = proximasOcorrencias(
      { frequencia: 'semanal', diaSemana: 6, hora: '10:00' },
      3,
      agora,
    );
    expect(datas.map((d) => d.toISOString())).toEqual([
      '2026-08-08T13:00:00.000Z',
      '2026-08-15T13:00:00.000Z',
      '2026-08-22T13:00:00.000Z',
    ]);
  });

  it('quinzenal pula uma semana', () => {
    const datas = proximasOcorrencias(
      { frequencia: 'quinzenal', diaSemana: 6, hora: '10:00' },
      2,
      agora,
    );
    expect(datas.map((d) => diaEmBrasilia(d))).toEqual(['2026-08-08', '2026-08-22']);
  });

  it('mensal mantém o dia da semana, e não o dia do mês', () => {
    // "Todo mês no sábado" é o que a barbearia combina. Dia 8 de todo mês
    // cairia numa terça, numa quinta, num domingo fechado.
    const datas = proximasOcorrencias(
      { frequencia: 'mensal', diaSemana: 6, hora: '10:00' },
      3,
      agora,
    );
    for (const data of datas) {
      expect(diaSemanaEmBrasilia(data)).toBe(6);
    }
    expect(diasEntreOcorrencias('mensal')).toBe(28);
  });

  it('continua de onde parou, sem repetir o que já existe', () => {
    const datas = proximasOcorrencias(
      {
        frequencia: 'semanal',
        diaSemana: 6,
        hora: '10:00',
        geradoAte: '2026-08-15T13:00:00.000Z',
      },
      2,
      agora,
    );
    expect(datas.map((d) => diaEmBrasilia(d))).toEqual(['2026-08-22', '2026-08-29']);
  });

  it('para na data de fim', () => {
    const datas = proximasOcorrencias(
      {
        frequencia: 'semanal',
        diaSemana: 6,
        hora: '10:00',
        ate: '2026-08-20T00:00:00.000Z',
      },
      10,
      agora,
    );
    expect(datas.map((d) => diaEmBrasilia(d))).toEqual(['2026-08-08', '2026-08-15']);
  });

  it('série parada há meses não despeja o passado na agenda', () => {
    // Retomar em agosto uma série gerada até março não pode criar vinte
    // horários que já passaram.
    const datas = proximasOcorrencias(
      {
        frequencia: 'semanal',
        diaSemana: 6,
        hora: '10:00',
        geradoAte: '2026-03-07T13:00:00.000Z',
      },
      3,
      agora,
    );
    for (const data of datas) {
      expect(data.getTime()).toBeGreaterThan(agora.getTime());
    }
  });

  it('série malformada não gera nada em vez de gerar lixo', () => {
    expect(proximasOcorrencias({ frequencia: 'anual' as any, diaSemana: 6, hora: '10:00' }, 3, agora)).toEqual([]);
    expect(proximasOcorrencias({ frequencia: 'semanal', diaSemana: 9, hora: '10:00' }, 3, agora)).toEqual([]);
    expect(proximasOcorrencias({ frequencia: 'semanal', diaSemana: 6, hora: '99:99' }, 3, agora)).toEqual([]);
  });

  it('frequenciaValida só aceita as três', () => {
    expect(frequenciaValida('semanal')).toBe(true);
    expect(frequenciaValida('diaria')).toBe(false);
    expect(frequenciaValida(null)).toBe(false);
  });
});

describe('como a série se lê', () => {
  it('em português, do jeito que o dono combina com o cliente', () => {
    expect(descreverSerie({ frequencia: 'semanal', diaSemana: 6, hora: '10:00' })).toBe(
      'Toda semana, sábado às 10:00',
    );
    expect(descreverSerie({ frequencia: 'quinzenal', diaSemana: 2, hora: '15:30' })).toBe(
      'A cada 15 dias, terça-feira às 15:30',
    );
  });
});
