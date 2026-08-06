import {
  comoOClienteLe,
  diaEmBrasilia,
  horaEmBrasilia,
  horariosLivres,
  instanteEmBrasilia,
  noMesmoDia,
  planoTemRobo,
  porqueNaoDaParaRemarcar,
} from './conversa';

describe('instanteEmBrasilia', () => {
  // O servidor no Render roda em UTC. Sem o fuso na ponta, as 15h que o
  // cliente pediu viravam meio-dia em Brasília — com a API respondendo 200.
  it('data sem fuso é hora de Brasília, não do servidor', () => {
    const d = instanteEmBrasilia('2026-08-07T15:00')!;
    expect(d.toISOString()).toBe('2026-08-07T18:00:00.000Z');
    expect(horaEmBrasilia(d)).toBe('15:00');
  });

  it('aceita espaço no lugar do T', () => {
    expect(instanteEmBrasilia('2026-08-07 15:00')!.toISOString()).toBe(
      '2026-08-07T18:00:00.000Z',
    );
  });

  it('aceita o formato que o brasileiro escreve', () => {
    expect(instanteEmBrasilia('07/08/2026 15:00')!.toISOString()).toBe(
      '2026-08-07T18:00:00.000Z',
    );
    expect(instanteEmBrasilia('7/8/2026 9:30')!.toISOString()).toBe(
      '2026-08-07T12:30:00.000Z',
    );
  });

  it('quando o fuso vem escrito, ele manda', () => {
    expect(instanteEmBrasilia('2026-08-07T18:00:00Z')!.toISOString()).toBe(
      '2026-08-07T18:00:00.000Z',
    );
    expect(instanteEmBrasilia('2026-08-07T15:00:00-03:00')!.toISOString()).toBe(
      '2026-08-07T18:00:00.000Z',
    );
  });

  // 31/02 vira 03/03 no construtor do Date. Mandar o cliente para outro dia
  // sem avisar é pior do que dizer que não entendeu.
  it('data que não existe é recusada, e não empurrada para frente', () => {
    expect(instanteEmBrasilia('31/02/2026')).toBeNull();
    expect(instanteEmBrasilia('2026-02-30')).toBeNull();
  });

  it('lixo não vira data', () => {
    expect(instanteEmBrasilia('')).toBeNull();
    expect(instanteEmBrasilia('amanhã de tarde')).toBeNull();
    expect(instanteEmBrasilia(null)).toBeNull();
    expect(instanteEmBrasilia(undefined)).toBeNull();
    expect(instanteEmBrasilia({})).toBeNull();
  });
});

describe('dia e hora em Brasília', () => {
  it('a virada do dia é a de Brasília, não a do UTC', () => {
    // 02:00 UTC do dia 8 ainda é 23:00 do dia 7 em Brasília.
    const d = new Date('2026-08-08T02:00:00Z');
    expect(diaEmBrasilia(d)).toBe('2026-08-07');
    expect(horaEmBrasilia(d)).toBe('23:00');
  });

  it('noMesmoDia usa o calendário do cliente', () => {
    expect(
      noMesmoDia(new Date('2026-08-08T02:00:00Z'), new Date('2026-08-07T12:00:00Z')),
    ).toBe(true);
  });

  it('comoOClienteLe escreve do jeito que se fala', () => {
    expect(comoOClienteLe(new Date('2026-08-07T18:00:00Z'))).toBe('07/08 às 15:00');
  });
});

describe('por que não dá para remarcar', () => {
  const agora = new Date('2026-08-07T20:00:00Z'); // 17:00 em Brasília
  const daqui = (minutos: number) =>
    new Date(agora.getTime() + minutos * 60000).toISOString();

  it('deixa passar quando está tudo certo', () => {
    expect(
      porqueNaoDaParaRemarcar({ status: 'agendado' }, daqui(120), agora),
    ).toBeNull();
  });

  // O pedido que o dono trouxe: o cliente lembra à tarde e pede um horário da
  // manhã. Ele precisa ouvir que o horário passou E que horas são agora.
  it('horário de HOJE que já passou diz que passou e que horas são', () => {
    const msg = porqueNaoDaParaRemarcar(
      { status: 'agendado' },
      '2026-08-07T09:00',
      agora,
    )!;
    expect(msg).toContain('já passou');
    expect(msg).toContain('hoje');
    expect(msg).toContain('17:00');
  });

  it('dia que já passou é outra frase, e não a de hoje', () => {
    const msg = porqueNaoDaParaRemarcar(
      { status: 'agendado' },
      '2026-08-01T15:00',
      agora,
    )!;
    expect(msg).toContain('dia já passou');
    // Não é a frase de hoje: quem digitou o ano errado não precisa saber que
    // horas são agora.
    expect(msg).not.toContain('agora são');
  });

  it('daqui a cinco minutos é cedo demais, e a frase diz a partir de quando dá', () => {
    const msg = porqueNaoDaParaRemarcar({ status: 'agendado' }, daqui(5), agora)!;
    expect(msg).toContain('antecedência');
    expect(msg).toContain('17:15');
  });

  it('cancelado e concluído têm cada um a sua frase', () => {
    expect(porqueNaoDaParaRemarcar({ status: 'cancelado' }, daqui(120), agora)).toContain(
      'cancelado',
    );
    expect(porqueNaoDaParaRemarcar({ status: 'concluido' }, daqui(120), agora)).toContain(
      'já foi realizado',
    );
  });

  // O status vem antes da data de propósito: quem pede para remarcar um
  // agendamento cancelado precisa ouvir que ele foi cancelado, e não que a
  // data está errada.
  it('o status ganha da data', () => {
    expect(
      porqueNaoDaParaRemarcar({ status: 'cancelado' }, 'nada disso', agora),
    ).toContain('cancelado');
  });

  it('sem data, pede a data', () => {
    for (const vazio of [undefined, null, '', '   ']) {
      expect(porqueNaoDaParaRemarcar({ status: 'agendado' }, vazio, agora)).toContain(
        'para qual dia',
      );
    }
  });

  it('data que não dá para ler vira pedido de formato', () => {
    expect(
      porqueNaoDaParaRemarcar({ status: 'agendado' }, 'semana que vem', agora),
    ).toContain('formato');
  });

  it('remarcar para o mesmo horário avisa em vez de fingir que mudou', () => {
    const msg = porqueNaoDaParaRemarcar(
      { status: 'agendado', data: '2026-08-08T13:00:00Z' },
      '2026-08-08T10:00',
      agora,
    )!;
    expect(msg).toContain('já é o horário');
    expect(msg).toContain('10:00');
  });
});

describe('horários livres', () => {
  const expediente = { aberto: true, abertura: 9, fechamento: 18 };
  const cedo = new Date('2026-08-07T10:00:00Z'); // 07:00 em Brasília

  const intervalo = (h: string, minutos: number) => {
    const inicio = new Date(`2026-08-07T${h}:00-03:00`);
    return { inicio, fim: new Date(inicio.getTime() + minutos * 60000) };
  };

  it('abre de meia em meia hora, do início ao fim do expediente', () => {
    const livres = horariosLivres({
      expediente,
      dia: '2026-08-07',
      duracaoMin: 30,
      ocupados: [],
      agora: cedo,
    });
    expect(livres[0]).toBe('09:00');
    expect(livres[livres.length - 1]).toBe('17:30');
    expect(livres).toHaveLength(18);
  });

  it('tira o que está ocupado', () => {
    const livres = horariosLivres({
      expediente,
      dia: '2026-08-07',
      duracaoMin: 30,
      ocupados: [intervalo('10:00', 60)],
      agora: cedo,
    });
    expect(livres).not.toContain('10:00');
    expect(livres).not.toContain('10:30');
    expect(livres).toContain('11:00');
  });

  // O combo de uma hora não cabe às 17h30 numa barbearia que fecha às 18h,
  // mesmo com as 17h30 livres. Oferecer esse horário é prometer o que a API
  // vai recusar em seguida.
  it('atendimento longo não é oferecido se não couber antes de fechar', () => {
    const livres = horariosLivres({
      expediente,
      dia: '2026-08-07',
      duracaoMin: 60,
      ocupados: [],
      agora: cedo,
    });
    expect(livres[livres.length - 1]).toBe('17:00');
  });

  it('atendimento longo não cabe numa fresta curta', () => {
    const livres = horariosLivres({
      expediente,
      dia: '2026-08-07',
      duracaoMin: 60,
      // Livre só das 10:00 às 10:30 — não dá para uma hora.
      ocupados: [intervalo('09:00', 60), intervalo('10:30', 120)],
      agora: cedo,
    });
    expect(livres).not.toContain('10:00');
    expect(livres).toContain('12:30');
  });

  it('hoje só mostra o que ainda vai acontecer', () => {
    const tarde = new Date('2026-08-07T18:10:00Z'); // 15:10 em Brasília
    const livres = horariosLivres({
      expediente,
      dia: '2026-08-07',
      duracaoMin: 30,
      ocupados: [],
      agora: tarde,
    });
    expect(livres).not.toContain('15:00');
    expect(livres[0]).toBe('15:30');
  });

  it('dia fechado não tem horário nenhum', () => {
    expect(
      horariosLivres({
        expediente: { aberto: false, abertura: 0, fechamento: 0 },
        dia: '2026-08-07',
        duracaoMin: 30,
        ocupados: [],
        agora: cedo,
      }),
    ).toEqual([]);
    expect(
      horariosLivres({
        expediente: null,
        dia: '2026-08-07',
        duracaoMin: 30,
        ocupados: [],
        agora: cedo,
      }),
    ).toEqual([]);
  });
});

describe('o robô é dos planos pagos', () => {
  it('Profissional e Premium têm', () => {
    expect(planoTemRobo({ nome: 'Profissional', features: [] })).toBe(true);
    expect(planoTemRobo({ nome: 'Premium', features: [] })).toBe(true);
    expect(planoTemRobo({ nome: 'PREMIUM', features: [] })).toBe(true);
  });

  it('plano fora da lista não tem', () => {
    expect(planoTemRobo({ nome: 'Básico', features: ['Agendamentos online'] })).toBe(false);
    expect(planoTemRobo(null)).toBe(false);
  });

  // Para o dono do SaaS liberar num plano sob medida sem mexer em código.
  it('a feature escrita à mão libera', () => {
    expect(planoTemRobo({ nome: 'Sob medida', features: ['Robô de WhatsApp'] })).toBe(true);
  });
});
