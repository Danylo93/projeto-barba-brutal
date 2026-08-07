import {
  comoOClienteLe,
  diaEmBrasilia,
  horaEmBrasilia,
  horariosLivres,
  idsDeServicos,
  instanteEmBrasilia,
  expedienteParaOCliente,
  montarCardapio,
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

  // O furo que a revisão pegou: estes formatos NÃO casavam com as expressões
  // daqui, caíam no `new Date(texto)` e viravam a hora do SERVIDOR. Em UTC,
  // "2026-8-13 15:00" era gravado como meio-dia de Brasília — com 201 na
  // resposta. O cliente aparecia às 15h e o barbeiro tinha outra pessoa na
  // cadeira.
  it('mês e dia sem zero à esquerda continuam sendo Brasília', () => {
    expect(instanteEmBrasilia('2026-8-13 15:00')!.toISOString()).toBe(
      '2026-08-13T18:00:00.000Z',
    );
    expect(instanteEmBrasilia('2026-8-7T9:05')!.toISOString()).toBe(
      '2026-08-07T12:05:00.000Z',
    );
  });

  it('com segundos também', () => {
    expect(instanteEmBrasilia('12/09/2026 16:00:00')!.toISOString()).toBe(
      '2026-09-12T19:00:00.000Z',
    );
    expect(instanteEmBrasilia('2026-08-07 15:00:00')!.toISOString()).toBe(
      '2026-08-07T18:00:00.000Z',
    );
  });

  // A regra que fecha a porta: sem fuso escrito, ou casa com um formato
  // conhecido ou é `null`. Nunca o fuso do servidor.
  it('sem fuso escrito e fora dos formatos conhecidos, é null', () => {
    expect(instanteEmBrasilia('Aug 7 2026 15:00')).toBeNull();
    expect(instanteEmBrasilia('2026/08/07 15:00')).toBeNull();
    expect(instanteEmBrasilia('7 de agosto às 15h')).toBeNull();
  });

  it('hora que não existe é recusada', () => {
    expect(instanteEmBrasilia('2026-08-07 25:00')).toBeNull();
    expect(instanteEmBrasilia('07/08/2026 10:75')).toBeNull();
  });

  // O ano 9999 fazia o Prisma estourar ao somar o fuso, e virava 500.
  it('data fora do alcance de uma agenda é recusada', () => {
    expect(instanteEmBrasilia('9999-12-31')).toBeNull();
    expect(instanteEmBrasilia('1500-01-01')).toBeNull();
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

describe('montarCardapio', () => {
  const servicos = [
    { id: 19, nome: 'Corte de Cabelo', preco: 45 },
    { id: 20, nome: 'Barba', preco: 35 },
    { id: 23, nome: 'Dia do Noivo', preco: 180 },
  ];

  it('diz o nome do que cada profissional faz, não só o id', () => {
    const { profissionais } = montarCardapio(servicos, [
      { id: 14, nome: 'Patricia Pereira', servicos: [{ id: 20 }, { id: 23 }] },
    ]);

    expect(profissionais[0].atende.map((s) => s.nome)).toEqual(['Barba', 'Dia do Noivo']);
  });

  // O caso que aconteceu: o agente respondeu "dá sim" a um corte com quem só
  // faz barba, porque o cardápio pedia que ele cruzasse ids de cabeça.
  it('não põe o profissional em serviço que ele não atende', () => {
    const cardapio = montarCardapio(servicos, [
      { id: 14, nome: 'Patricia Pereira', servicos: [{ id: 20 }, { id: 23 }] },
    ]);

    // A barba é dela, e o cardápio diz o nome de quem faz.
    expect(cardapio.servicos.find((s) => s.id === 20)!.feitoPor).toEqual([
      'Patricia Pereira',
    ]);
    // O corte não é: ninguém atende, então saiu da vitrine em vez de sair com
    // `feitoPor` vazio e ser anunciado assim mesmo.
    expect(cardapio.servicos.some((s) => s.id === 19)).toBe(false);
    expect(cardapio.semProfissional).toContainEqual({ id: 19, nome: 'Corte de Cabelo' });
  });

  // Lista vazia é "sem restrição" para validarServicosDoAgendamento. Se o
  // cardápio dissesse "não faz nada", o robô negaria o que a API aceita.
  it('profissional sem vínculo nenhum atende tudo', () => {
    const cardapio = montarCardapio(servicos, [{ id: 7, nome: 'Marcão', servicos: [] }]);

    expect(cardapio.profissionais[0].atende).toHaveLength(3);
    expect(cardapio.servicos.every((s) => s.feitoPor.includes('Marcão'))).toBe(true);
  });

  it('mantém preço e o resto do serviço intactos', () => {
    const cardapio = montarCardapio(servicos, [{ id: 7, nome: 'Marcão', servicos: [] }]);
    expect(cardapio.servicos[0]).toMatchObject({ id: 19, nome: 'Corte de Cabelo', preco: 45 });
  });

  /**
   * Serviço que ninguém atende não vai para a vitrine.
   *
   * O caso é da Lá Tita, tirado de uma conversa real: seis serviços no
   * cardápio, uma profissional vinculada a dois. O robô anunciou os seis com
   * preço e negou quatro em seguida — inclusive corte de cabelo, que é o mais
   * pedido de uma barbearia. Prometer e negar é pior do que já dizer não.
   */
  describe('serviço sem ninguém para atender', () => {
    const soPatricia = [
      { id: 14, nome: 'Patricia Pereira', servicos: [{ id: 20 }, { id: 23 }] },
    ];

    it('some da lista que o robô anuncia', () => {
      const { servicos: anunciaveis } = montarCardapio(servicos, soPatricia);

      expect(anunciaveis.map((s) => s.nome)).toEqual(['Barba', 'Dia do Noivo']);
      expect(anunciaveis.map((s) => s.nome)).not.toContain('Corte de Cabelo');
    });

    // Sai da vitrine, mas não some da resposta: o robô precisa RECONHECER o
    // pedido para dizer "esse a gente não está atendendo agora" em vez de
    // tratar como serviço que não existe na barbearia.
    it('continua listado à parte, para o robô reconhecer o pedido', () => {
      const { semProfissional } = montarCardapio(servicos, soPatricia);

      expect(semProfissional).toEqual([{ id: 19, nome: 'Corte de Cabelo' }]);
    });

    it('barbearia sem profissional nenhum não anuncia nada', () => {
      const cardapio = montarCardapio(servicos, []);

      expect(cardapio.servicos).toEqual([]);
      expect(cardapio.semProfissional).toHaveLength(3);
    });

    // Vínculo vazio quer dizer "atende tudo" — nada pode cair no balde errado.
    it('profissional sem vínculo mantém o cardápio inteiro na vitrine', () => {
      const cardapio = montarCardapio(servicos, [{ id: 7, nome: 'Marcão', servicos: [] }]);

      expect(cardapio.servicos).toHaveLength(3);
      expect(cardapio.semProfissional).toEqual([]);
    });
  });
});

/**
 * O caso que quebrou na frente do cliente: ele escolheu barba, profissional e
 * horário, e no "pode ser hoje às 16h" levou "deu um problema no sistema".
 *
 * A ferramenta manda `servicos: "20"` — texto. O `/horarios` lia assim desde
 * sempre; o `/agendamentos` esperava array e caía num `servicoId` inexistente.
 */
describe('idsDeServicos', () => {
  it('lê o texto que a ferramenta do n8n manda', () => {
    expect(idsDeServicos('20')).toEqual([20]);
    expect(idsDeServicos('20,21')).toEqual([20, 21]);
    expect(idsDeServicos('20, 21 , 22')).toEqual([20, 21, 22]);
  });

  it('lê array também, que é como a tela manda', () => {
    expect(idsDeServicos([20, 21])).toEqual([20, 21]);
    expect(idsDeServicos(['20', '21'])).toEqual([20, 21]);
  });

  it('sem serviço é lista vazia, não erro', () => {
    expect(idsDeServicos(undefined)).toEqual([]);
    expect(idsDeServicos(null)).toEqual([]);
    expect(idsDeServicos('')).toEqual([]);
    expect(idsDeServicos('   ')).toEqual([]);
    expect(idsDeServicos([])).toEqual([]);
  });

  // Foi assim que o robô montou a URL com um id que ele não tinha.
  it('lixo é null, para quem chama escolher a frase', () => {
    expect(idsDeServicos('undefined')).toBeNull();
    expect(idsDeServicos('barba')).toBeNull();
    expect(idsDeServicos('0')).toBeNull();
    expect(idsDeServicos('-3')).toBeNull();
    expect(idsDeServicos('1.5')).toBeNull();
  });

  // Marcar metade do que a pessoa pediu é pior do que dizer que não entendeu.
  it('um pedaço ruim invalida a lista inteira', () => {
    expect(idsDeServicos('20,barba')).toBeNull();
    expect(idsDeServicos([20, 'nada'])).toBeNull();
  });
});

describe('expedienteParaOCliente', () => {
  const semana = (abertos: number[]) => ({
    horarios: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
      dia,
      aberto: abertos.includes(dia),
      abertura: '08:00',
      fechamento: '21:00',
    })),
  });

  it('devolve os sete dias, com o que abre e o que não abre', () => {
    const dias = expedienteParaOCliente(semana([1, 2, 3, 4, 5, 6]));
    expect(dias).toHaveLength(7);
    expect(dias[0]).toEqual({ dia: 'domingo', aberto: false });
    expect(dias[1]).toEqual({ dia: 'segunda', aberto: true, abre: '08:00', fecha: '21:00' });
  });

  it('lê a hora que o painel grava como texto', () => {
    // O painel usa <input type="time">, que devolve "08:00" — não número.
    const dias = expedienteParaOCliente(semana([6]));
    expect(dias[6]).toEqual({ dia: 'sábado', aberto: true, abre: '08:00', fecha: '21:00' });
  });

  it('mostra meia hora, em vez de arredondar para a hora cheia', () => {
    const meia = {
      horarios: [{ dia: 3, aberto: true, abertura: '09:30', fechamento: '18:30' }],
    };
    const quarta = expedienteParaOCliente(meia).find((d) => d.dia === 'quarta');
    expect(quarta).toEqual({ dia: 'quarta', aberto: true, abre: '09:30', fecha: '18:30' });
  });

  it('barbearia sem expediente configurado devolve lista vazia', () => {
    // Nada configurado é diferente de fechado: o robô precisa saber que não
    // sabe, para dizer que vai confirmar em vez de inventar um horário.
    expect(expedienteParaOCliente(null)).toEqual([]);
    expect(expedienteParaOCliente({})).toEqual([]);
  });

  it('hora ilegível não vira NaN nem horário inventado', () => {
    const torto = { horarios: [{ dia: 1, aberto: true, abertura: 'de manhã', fechamento: '21:00' }] };
    expect(expedienteParaOCliente(torto)).toEqual([]);
  });
});
