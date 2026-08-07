import { AgendamentoRepository } from './agendamento.repository';
import { diaPedidoEmBrasilia, janelaDoDiaEmBrasilia } from './agendamento.validacao';

/**
 * O dia da agenda é o dia de quem trabalha na barbearia, não o dia do relógio
 * do servidor. No Render o processo roda em UTC, e o recorte antigo
 * (`new Date(ano, mes, dia)`) fazia o dia começar às 21h do dia anterior em
 * Brasília — atendimento das 21h em diante aparecia no dia seguinte.
 *
 * Por isso os testes conferem o instante em UTC, escrito por extenso: assim
 * eles valem igual na máquina de quem desenvolve e no servidor.
 */
describe('janelaDoDiaEmBrasilia', () => {
  it('começa à meia-noite de Brasília, que é 03:00 UTC', () => {
    const { inicio } = janelaDoDiaEmBrasilia(new Date('2026-08-07T18:00:00Z'));
    expect(inicio.toISOString()).toBe('2026-08-07T03:00:00.000Z');
  });

  it('termina no último instante antes da meia-noite seguinte', () => {
    const { fim } = janelaDoDiaEmBrasilia(new Date('2026-08-07T18:00:00Z'));
    expect(fim.toISOString()).toBe('2026-08-08T02:59:59.999Z');
  });

  it('uma data das 00h30 UTC ainda é o dia anterior em Brasília', () => {
    // 00:30Z do dia 08 são 21:30 do dia 07 aqui.
    const { inicio } = janelaDoDiaEmBrasilia(new Date('2026-08-08T00:30:00Z'));
    expect(inicio.toISOString()).toBe('2026-08-07T03:00:00.000Z');
  });
});

function repoEspiao() {
  const capturado: any = {};
  const prisma: any = {
    agendamento: {
      findMany: jest.fn(async (args: any) => {
        capturado.where = args.where;
        return [];
      }),
    },
  };
  return { repo: new AgendamentoRepository(prisma), capturado };
}

/**
 * O horário está dentro da janela que o repositório pediu ao banco?
 *
 * O `dia` vai como texto de propósito: é exatamente o que a tela manda na URL
 * (`/agendamentos/14/2026-08-07`).
 */
async function apareceNoDia(instanteUtc: string, dia: string): Promise<boolean> {
  const { repo, capturado } = repoEspiao();
  await repo.buscarPorProfissional(14, dia, 14);
  const alvo = new Date(instanteUtc);
  return alvo >= capturado.where.data.gte && alvo <= capturado.where.data.lte;
}

describe('agenda do dia da barbearia', () => {
  it('mostra o atendimento das 15:00 no dia dele', async () => {
    await expect(apareceNoDia('2026-08-08T18:00:00.000Z', '2026-08-08')).resolves.toBe(true);
  });

  it('mostra o atendimento das 21:00 no dia dele, não no seguinte', async () => {
    // 21:00 de Brasília do dia 07 = 00:00Z do dia 08. Era aqui que a agenda
    // do dono mostrava o cliente no dia errado.
    await expect(apareceNoDia('2026-08-08T00:00:00.000Z', '2026-08-07')).resolves.toBe(true);
    await expect(apareceNoDia('2026-08-08T00:00:00.000Z', '2026-08-08')).resolves.toBe(false);
  });

  it('não puxa o atendimento das 21:00 do dia anterior', async () => {
    // 21:00 do dia 06 (00:00Z do dia 07) não é assunto do dia 07.
    await expect(apareceNoDia('2026-08-07T00:00:00.000Z', '2026-08-07')).resolves.toBe(false);
  });

  it('pega o último minuto do dia, às 23:59', async () => {
    await expect(apareceNoDia('2026-08-08T02:59:00.000Z', '2026-08-07')).resolves.toBe(true);
  });
});

describe('diaPedidoEmBrasilia', () => {
  it('lê "2026-08-07" como meia-noite daqui, não de Greenwich', () => {
    expect(diaPedidoEmBrasilia('2026-08-07')!.toISOString()).toBe('2026-08-07T03:00:00.000Z');
  });

  it('data com hora escrita passa direto', () => {
    expect(diaPedidoEmBrasilia('2026-08-07T18:00:00Z')!.toISOString()).toBe(
      '2026-08-07T18:00:00.000Z',
    );
  });

  it('devolve null para o que não é data', () => {
    expect(diaPedidoEmBrasilia('quinta que vem')).toBeNull();
    expect(diaPedidoEmBrasilia('')).toBeNull();
    expect(diaPedidoEmBrasilia(new Date('nada'))).toBeNull();
  });
});
