import { ObterHorariosOcupados } from '../types';

/**
 * Duas regras decidem se um horário está ocupado, e elas vieram de lados
 * diferentes: o STATUS (que ganhou o `expirado` no master) e o SINAL (que
 * veio desta branch). O merge juntou as duas num filtro só.
 *
 * Este arquivo existe por causa dessa costura. Cada lado tinha teste; a
 * combinação não tinha nenhum — e é justamente onde um merge quebra sem
 * ninguém ver: basta um `&&` virar `||` para a agenda inteira mudar de
 * comportamento com todos os outros testes passando.
 */

const PROFISSIONAL = 7;
const TENANT = 1;
const DIA = '2026-08-15';

/** 10h em Brasília, no dia de referência. */
const DEZ_DA_MANHA = new Date('2026-08-15T13:00:00Z');

function repositorioCom(agendamentos: any[]) {
  return {
    buscarPorProfissional: async () => agendamentos,
    buscarBloqueios: async () => [],
  } as any;
}

function agendamento(extra: Record<string, unknown> = {}) {
  return {
    data: DEZ_DA_MANHA,
    servicos: [{ qtdeSlots: 1 }],
    status: 'agendado',
    sinalStatus: null,
    sinalExpiraEm: null,
    ...extra,
  };
}

async function ocupados(agendamentos: any[]): Promise<string[]> {
  const caso = new ObterHorariosOcupados(repositorioCom(agendamentos));
  return caso.executar(PROFISSIONAL, DIA, TENANT);
}

describe('o que ocupa um horário na agenda', () => {
  it('agendamento comum ocupa', async () => {
    expect(await ocupados([agendamento()])).toContain('10:00');
  });

  it('confirmado também', async () => {
    expect(await ocupados([agendamento({ status: 'confirmado' })])).toContain('10:00');
  });
});

describe('o status tira da agenda', () => {
  it.each(['cancelado', 'concluido', 'expirado'])('%s não ocupa', async (status) => {
    expect(await ocupados([agendamento({ status })])).toEqual([]);
  });

  it('status desconhecido não ocupa', async () => {
    // A lista é fechada de propósito. Foi assim que o `expirado` entrou sem
    // precisar mexer aqui — e é assim que o próximo status entra também.
    expect(await ocupados([agendamento({ status: 'inventado' })])).toEqual([]);
  });
});

describe('o sinal tira da agenda', () => {
  it('sinal expirado devolve o horário, mesmo com status agendado', async () => {
    const solto = agendamento({ status: 'agendado', sinalStatus: 'expirado' });
    expect(await ocupados([solto])).toEqual([]);
  });

  it('sinal pendente com prazo vencido também devolve', async () => {
    // A varredura pode estar atrasada; a agenda não espera por ela.
    const vencido = agendamento({
      sinalStatus: 'pendente',
      sinalExpiraEm: new Date(Date.now() - 60_000),
    });
    expect(await ocupados([vencido])).toEqual([]);
  });

  it('sinal pendente DENTRO do prazo continua ocupando', async () => {
    // O prazo é do cliente. Liberar aqui seria vender o horário dele
    // enquanto ele abre o app do banco.
    const noPrazo = agendamento({
      sinalStatus: 'pendente',
      sinalExpiraEm: new Date(Date.now() + 15 * 60_000),
    });
    expect(await ocupados([noPrazo])).toContain('10:00');
  });

  it('sinal pago ocupa', async () => {
    expect(await ocupados([agendamento({ sinalStatus: 'pago' })])).toContain('10:00');
  });
});

describe('as duas regras valem JUNTAS', () => {
  it('status bom e sinal solto não ocupa', async () => {
    const meio = agendamento({ status: 'confirmado', sinalStatus: 'expirado' });
    expect(await ocupados([meio])).toEqual([]);
  });

  it('sinal pago e status cancelado não ocupa', async () => {
    // O outro meio-termo. Se o filtro fosse `||`, este caso ocuparia — e a
    // barbearia perderia o horário de um agendamento que já foi cancelado.
    const meio = agendamento({ status: 'cancelado', sinalStatus: 'pago' });
    expect(await ocupados([meio])).toEqual([]);
  });

  it('só ocupa quem passa nas duas', async () => {
    const bom = agendamento({ status: 'agendado', sinalStatus: 'pago' });
    expect(await ocupados([bom])).toContain('10:00');
  });
});

describe('o agendamento que já existia antes de tudo isso', () => {
  it('sem status e sem sinal, ocupa', async () => {
    // Toda linha criada antes destas duas funcionalidades tem `sinalStatus`
    // NULO, e algumas nem status. Se o filtro as deixasse de fora, a agenda
    // inteira ficaria livre no dia do deploy.
    const legado = { data: DEZ_DA_MANHA, servicos: [{ qtdeSlots: 1 }] };
    expect(await ocupados([legado])).toContain('10:00');
  });
});

describe('duração do atendimento', () => {
  it('um combo de 1h ocupa os dois meios-horários', async () => {
    const combo = agendamento({ servicos: [{ qtdeSlots: 2 }] });
    const lista = await ocupados([combo]);
    expect(lista).toContain('10:00');
    expect(lista).toContain('10:30');
  });
});
