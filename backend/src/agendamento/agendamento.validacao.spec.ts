import {
  validarServicosDoAgendamento,
  validarDataDoAgendamento,
  normalizarIdsDeServico,
  duracaoEmMinutos,
  haConflito,
  removerPrecoDoCorpo,
} from './agendamento.validacao';

describe('validarServicosDoAgendamento', () => {
  const corte = { id: 1, ehCombo: false };
  const barba = { id: 2, ehCombo: false };
  const combo = { id: 3, ehCombo: true };

  it('rejeita quando nenhum serviço é selecionado', () => {
    expect(validarServicosDoAgendamento([], [])).toMatch(/ao menos um serviço/i);
  });

  it('aceita um único serviço avulso', () => {
    expect(validarServicosDoAgendamento([corte], [])).toBeNull();
  });

  it('aceita vários serviços avulsos juntos', () => {
    expect(validarServicosDoAgendamento([corte, barba], [])).toBeNull();
  });

  it('aceita um combo sozinho', () => {
    expect(validarServicosDoAgendamento([combo], [])).toBeNull();
  });

  it('rejeita combo junto com outro serviço', () => {
    expect(validarServicosDoAgendamento([combo, corte], [])).toMatch(/combo/i);
  });

  it('aceita serviços quando o profissional os realiza', () => {
    expect(validarServicosDoAgendamento([corte, barba], [1, 2, 3])).toBeNull();
  });

  it('rejeita serviço que o profissional não realiza', () => {
    expect(validarServicosDoAgendamento([corte, barba], [1])).toMatch(
      /não realiza/i,
    );
  });

  it('sem vínculo do profissional (lista vazia), aceita qualquer serviço', () => {
    expect(validarServicosDoAgendamento([corte, barba], [])).toBeNull();
  });
});

describe('validarDataDoAgendamento', () => {
  const agora = new Date('2026-07-27T12:00:00.000Z');

  it('aceita horário no futuro', () => {
    expect(
      validarDataDoAgendamento(new Date('2026-07-28T12:00:00.000Z'), agora),
    ).toBeNull();
  });

  it('rejeita horário no passado', () => {
    expect(
      validarDataDoAgendamento(new Date('2026-07-26T12:00:00.000Z'), agora),
    ).toMatch(/passou/i);
  });

  it('tolera pequena diferença de relógio', () => {
    expect(
      validarDataDoAgendamento(new Date('2026-07-27T11:59:00.000Z'), agora),
    ).toBeNull();
  });

  it('rejeita data ausente ou inválida', () => {
    expect(validarDataDoAgendamento(null, agora)).toMatch(/informe/i);
    expect(validarDataDoAgendamento('não é data', agora)).toMatch(/inválida/i);
  });
});

describe('normalizarIdsDeServico', () => {
  it('aceita lista de ids', () => {
    expect(normalizarIdsDeServico([1, 2])).toEqual([1, 2]);
  });

  it('aceita ids em texto', () => {
    expect(normalizarIdsDeServico(['1', '3'])).toEqual([1, 3]);
  });

  it('rejeita objetos (payload malformado) em vez de derrubar o servidor', () => {
    expect(normalizarIdsDeServico([{ id: 1 }])).toBeNull();
  });

  it('rejeita lista vazia, nulo e ids inválidos', () => {
    expect(normalizarIdsDeServico([])).toBeNull();
    expect(normalizarIdsDeServico(null)).toBeNull();
    expect(normalizarIdsDeServico([0])).toBeNull();
    expect(normalizarIdsDeServico([1.5])).toBeNull();
  });
});

describe('duracaoEmMinutos', () => {
  it('soma os slots dos serviços', () => {
    expect(duracaoEmMinutos([{ qtdeSlots: 1 }, { qtdeSlots: 2 }])).toBe(90);
  });

  it('assume um slot quando não informado', () => {
    expect(duracaoEmMinutos([{}])).toBe(30);
    expect(duracaoEmMinutos([])).toBe(30);
  });
});

describe('haConflito', () => {
  const em = (hora: string) => new Date(`2026-07-28T${hora}:00.000Z`);

  it('detecta sobreposição total', () => {
    expect(
      haConflito(
        { inicio: em('14:00'), duracaoMin: 30 },
        { inicio: em('14:00'), duracaoMin: 30 },
      ),
    ).toBe(true);
  });

  it('detecta sobreposição parcial (serviço longo invade o próximo)', () => {
    expect(
      haConflito(
        { inicio: em('14:00'), duracaoMin: 60 },
        { inicio: em('14:30'), duracaoMin: 30 },
      ),
    ).toBe(true);
  });

  it('não acusa conflito quando um termina e o outro começa', () => {
    expect(
      haConflito(
        { inicio: em('14:00'), duracaoMin: 30 },
        { inicio: em('14:30'), duracaoMin: 30 },
      ),
    ).toBe(false);
  });

  it('não acusa conflito em horários distantes', () => {
    expect(
      haConflito(
        { inicio: em('09:00'), duracaoMin: 30 },
        { inicio: em('17:00'), duracaoMin: 30 },
      ),
    ).toBe(false);
  });
});

describe('removerPrecoDoCorpo', () => {
  // O preço do serviço é definido pela barbearia no cadastro de serviços; nada
  // que venha no corpo do agendamento (cliente, barbeiro ou bot) pode alterar
  // o valor cobrado. O teste trava essa fronteira.
  it('descarta preco, valor e total enviados no corpo', () => {
    const corpo: any = {
      usuarioId: 1,
      profissionalId: 2,
      servicos: [1, 2],
      data: new Date(),
      preco: 5,
      valor: 10,
      total: 15,
    };
    removerPrecoDoCorpo(corpo);
    expect(corpo).toEqual({
      usuarioId: 1,
      profissionalId: 2,
      servicos: [1, 2],
      data: expect.any(Date),
    });
  });

  it('mantém os campos legítimos do agendamento intactos', () => {
    const corpo: any = {
      usuarioId: 1,
      profissionalId: 2,
      servicos: [3],
      data: new Date(),
      observacoes: 'Primeira vez',
      telefoneCliente: '11999990000',
    };
    removerPrecoDoCorpo(corpo);
    expect(corpo).toEqual({
      usuarioId: 1,
      profissionalId: 2,
      servicos: [3],
      data: expect.any(Date),
      observacoes: 'Primeira vez',
      telefoneCliente: '11999990000',
    });
  });
});
