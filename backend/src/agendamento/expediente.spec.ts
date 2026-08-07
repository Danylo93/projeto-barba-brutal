import {
  diaEHoraEmBrasilia,
  expedienteDoDia,
  validarDentroDoExpediente,
} from './agendamento.validacao';
import { horariosLivres } from '../whatsapp/conversa';

/** 2026-08-02 é um domingo. Datas em UTC, convertidas para Brasília (UTC−3). */
const domingo14hBrasilia = new Date('2026-08-02T17:00:00.000Z');
const domingo4hBrasilia = new Date('2026-08-02T07:00:00.000Z');
const segunda10hBrasilia = new Date('2026-08-03T13:00:00.000Z');
const segunda20hBrasilia = new Date('2026-08-03T23:00:00.000Z');

describe('diaEHoraEmBrasilia', () => {
  it('converte de UTC para o fuso de Brasília', () => {
    // 17:00 UTC = 14:00 em Brasília, domingo.
    expect(diaEHoraEmBrasilia(domingo14hBrasilia)).toEqual({ dia: 0, hora: 14 });
    expect(diaEHoraEmBrasilia(segunda10hBrasilia)).toEqual({ dia: 1, hora: 10 });
  });

  it('não deixa a virada de dia enganar', () => {
    // 02:00 UTC de segunda ainda é domingo, 23:00, em Brasília.
    const d = diaEHoraEmBrasilia(new Date('2026-08-03T02:00:00.000Z'));
    expect(d.dia).toBe(0);
    expect(d.hora).toBe(23);
  });

  it('lê os minutos como fração da hora', () => {
    expect(diaEHoraEmBrasilia(new Date('2026-08-03T13:30:00.000Z')).hora).toBe(10.5);
  });
});

describe('expedienteDoDia', () => {
  const formatoNovo = {
    horarios: [
      { dia: 0, aberto: false },
      { dia: 1, aberto: true, abertura: 9, fechamento: 19 },
      { dia: 6, aberto: true, abertura: 9, fechamento: 14 },
    ],
  };

  it('lê o formato por dia', () => {
    expect(expedienteDoDia(formatoNovo, 1)).toEqual({
      aberto: true,
      abertura: 9,
      fechamento: 19,
    });
    expect(expedienteDoDia(formatoNovo, 0)?.aberto).toBe(false);
    expect(expedienteDoDia(formatoNovo, 6)?.fechamento).toBe(14);
  });

  it('dia ausente da lista conta como fechado', () => {
    expect(expedienteDoDia(formatoNovo, 3)?.aberto).toBe(false);
  });

  it('lê o formato antigo, com um horário para todos os dias', () => {
    const antigo = { diasAbertos: [1, 2, 3], horaAbertura: 8, horaFechamento: 20 };
    expect(expedienteDoDia(antigo, 2)).toEqual({
      aberto: true,
      abertura: 8,
      fechamento: 20,
    });
    expect(expedienteDoDia(antigo, 0)?.aberto).toBe(false);
  });

  it('devolve null quando não há configuração', () => {
    // Barbearia que ainda não configurou nada não pode ser travada.
    expect(expedienteDoDia(null, 1)).toBeNull();
    expect(expedienteDoDia({}, 1)).toBeNull();
    expect(expedienteDoDia({ horaAbertura: 'oito' }, 1)).toBeNull();
  });
});

describe('validarDentroDoExpediente', () => {
  const config = {
    horarios: [
      { dia: 0, aberto: false },
      { dia: 1, aberto: true, abertura: 9, fechamento: 19 },
    ],
  };

  it('aceita horário dentro do expediente', () => {
    expect(validarDentroDoExpediente(segunda10hBrasilia, 30, config)).toBeNull();
  });

  it('recusa dia fechado, dizendo qual', () => {
    const erro = validarDentroDoExpediente(domingo14hBrasilia, 30, config);
    expect(erro).toContain('domingo');
  });

  it('recusa madrugada de domingo — o caso que passou em produção', () => {
    expect(validarDentroDoExpediente(domingo4hBrasilia, 30, config)).not.toBeNull();
  });

  it('recusa depois do fechamento', () => {
    const erro = validarDentroDoExpediente(segunda20hBrasilia, 30, config);
    expect(erro).toContain('09h');
    expect(erro).toContain('19h');
  });

  it('recusa quando o atendimento COMEÇA dentro mas TERMINA depois de fechar', () => {
    // 18:30 + 60 min = 19:30, passa das 19h.
    const dezoitoETrinta = new Date('2026-08-03T21:30:00.000Z');
    expect(validarDentroDoExpediente(dezoitoETrinta, 60, config)).not.toBeNull();
    // O mesmo horário com 30 min cabe justo.
    expect(validarDentroDoExpediente(dezoitoETrinta, 30, config)).toBeNull();
  });

  it('não trava barbearia sem configuração', () => {
    expect(validarDentroDoExpediente(domingo4hBrasilia, 30, null)).toBeNull();
    expect(validarDentroDoExpediente(domingo4hBrasilia, 30, {})).toBeNull();
  });
});

/**
 * O painel grava a hora com `<input type="time">`, que devolve STRING: "09:00".
 * Os testes acima usam número (9) e por isso nunca pegaram o que estava
 * quebrado em produção — `Number("09:00")` é NaN, e NaN não reclama: ele
 * desliga as duas pontas caladamente.
 *
 * No robô, o cliente ouvia "não tenho horário livre nesse dia" para TODO dia e
 * TODO serviço, porque o laço de horários livres não dava uma volta sequer.
 * Do outro lado, `validarDentroDoExpediente` parava de barrar qualquer coisa:
 * `3 < NaN` é false e `4 > NaN` é false, então a API aceitava agendamento às
 * três da manhã numa barbearia que abre às nove.
 */
describe('hora que vem do painel como texto', () => {
  const comoOPainelGrava = {
    horarios: [
      { dia: 0, aberto: false },
      { dia: 1, aberto: true, abertura: '09:00', fechamento: '19:00' },
      { dia: 2, aberto: true, abertura: '09:30', fechamento: '18:30' },
    ],
  };

  it('lê "09:00" como 9', () => {
    expect(expedienteDoDia(comoOPainelGrava, 1)).toEqual({
      aberto: true,
      abertura: 9,
      fechamento: 19,
    });
  });

  it('lê a meia hora como fração', () => {
    expect(expedienteDoDia(comoOPainelGrava, 2)).toEqual({
      aberto: true,
      abertura: 9.5,
      fechamento: 18.5,
    });
  });

  it('volta a barrar a madrugada', () => {
    // Segunda, 04:00 em Brasília, numa barbearia que abre às 09:00.
    const madrugada = new Date('2026-08-03T07:00:00.000Z');
    expect(validarDentroDoExpediente(madrugada, 30, comoOPainelGrava)).toMatch(/das 09h às 19h/);
  });

  it('volta a barrar o que estoura o fechamento', () => {
    // Segunda, 18:45, com 30 minutos de serviço, fecha 19:00 — não cabe.
    const tarde = new Date('2026-08-03T21:45:00.000Z');
    expect(validarDentroDoExpediente(tarde, 30, comoOPainelGrava)).toBeTruthy();
  });

  it('deixa passar o que cabe', () => {
    const dezDaManha = new Date('2026-08-03T13:00:00.000Z');
    expect(validarDentroDoExpediente(dezDaManha, 30, comoOPainelGrava)).toBeNull();
  });

  // O formato antigo (uma hora para a semana toda) vem do mesmo input.
  it('lê o formato antigo em texto também', () => {
    const antigo = { diasAbertos: [1], horaAbertura: '08:00', horaFechamento: '17:00' };
    expect(expedienteDoDia(antigo, 1)).toEqual({ aberto: true, abertura: 8, fechamento: 17 });
  });

  // Hora ilegível não pode virar "expediente das NaN às NaN".
  it('devolve null quando a hora não dá para ler', () => {
    const lixo = { horarios: [{ dia: 1, aberto: true, abertura: 'de manhã', fechamento: 'à noite' }] };
    expect(expedienteDoDia(lixo, 1)).toBeNull();
  });
});

/**
 * A costura entre os dois módulos, que é onde o bug morava.
 *
 * `expedienteDoDia` tinha teste. `horariosLivres` tinha teste. Os dois passavam
 * porque cada um era testado com número. Ninguém testava o caminho inteiro com
 * o que o painel realmente grava — e era só ali que aparecia.
 *
 * O caso é o da Lá Tita, tirado de uma conversa de verdade: Patricia Pereira,
 * Dia do Noivo (4 slots, 120 minutos), numa terça sem nenhum agendamento.
 */
describe('do que o painel grava até o horário que o cliente ouve', () => {
  const laTita = {
    horarios: [
      { dia: 0, aberto: false },
      { dia: 2, aberto: true, abertura: '09:00', fechamento: '18:00' },
    ],
  };

  it('oferece horário para um serviço de duas horas num dia livre', () => {
    const livres = horariosLivres({
      expediente: expedienteDoDia(laTita, 2),
      dia: '2026-08-11',
      duracaoMin: 120,
      ocupados: [],
      agora: new Date('2026-08-07T15:23:00.000Z'),
    });

    // Das 09:00 às 16:00 cabe um atendimento de 2h que termina até as 18:00.
    expect(livres.length).toBeGreaterThan(0);
    expect(livres[0]).toBe('09:00');
    expect(livres[livres.length - 1]).toBe('16:00');
  });

  it('continua respeitando o que já está ocupado', () => {
    const livres = horariosLivres({
      expediente: expedienteDoDia(laTita, 2),
      dia: '2026-08-11',
      duracaoMin: 120,
      // Alguém já pegou das 10:00 às 12:00.
      ocupados: [
        {
          inicio: new Date('2026-08-11T10:00:00-03:00'),
          fim: new Date('2026-08-11T12:00:00-03:00'),
        },
      ],
      agora: new Date('2026-08-07T15:23:00.000Z'),
    });

    expect(livres).not.toContain('09:00'); // terminaria 11:00, em cima do ocupado
    expect(livres).not.toContain('11:00');
    expect(livres).toContain('12:00');
  });
});
