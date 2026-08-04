import { AgendamentoRepository } from './agendamento.repository';

/**
 * A corrida de agenda dupla só aparece com dois clientes de verdade batendo no
 * mesmo instante — coisa de teste de integração, não de unidade. O que dá para
 * garantir aqui é a *estrutura* que impede a corrida, e é o que este arquivo
 * faz: a checagem de conflito e a gravação precisam acontecer dentro da mesma
 * transação, depois da trava. Se alguém tirar a transação para "simplificar",
 * estes testes caem antes de a agenda dupla voltar em produção.
 */

const AMANHA = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return d;
};

function montar(opcoes: { existentes?: any[] } = {}) {
  const passos: string[] = [];

  const tx = {
    $executeRaw: jest.fn(async (partes: TemplateStringsArray) => {
      passos.push(String(partes.raw?.join('?') ?? partes).includes('pg_advisory_xact_lock')
        ? 'travar'
        : 'sql');
      return 1;
    }),
    servico: {
      findMany: jest.fn(async () => [
        { id: 1, ehCombo: false, qtdeSlots: 1, preco: 45 },
      ]),
    },
    profissional: {
      findFirst: jest.fn(async () => ({ id: 9, servicos: [{ id: 1 }] })),
    },
    tenant: { findUnique: jest.fn(async () => ({ configuracoes: null })) },
    bloqueio: { findFirst: jest.fn(async () => null) },
    agendamento: {
      findMany: jest.fn(async () => {
        passos.push('conferir conflito');
        return opcoes.existentes ?? [];
      }),
      create: jest.fn(async () => {
        passos.push('gravar');
        return { id: 123 };
      }),
      update: jest.fn(async () => {
        passos.push('gravar');
        return { id: 123 };
      }),
      findFirst: jest.fn(async () => ({
        id: 123,
        profissionalId: 9,
        usuarioId: 5,
        servicos: [{ id: 1 }],
      })),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (trabalho: any) => {
      passos.push('abrir transação');
      const r = await trabalho(tx);
      passos.push('fechar transação');
      return r;
    }),
    agendamento: { findFirst: tx.agendamento.findFirst },
  };

  const repo = new AgendamentoRepository(prisma as any);
  return { repo, prisma, tx, passos };
}

const novoAgendamento = () => ({
  data: AMANHA(),
  profissionalId: 9,
  usuarioId: 5,
  tenantId: 7,
  servicos: [1],
});

describe('agenda dupla', () => {
  it('confere o conflito e grava dentro da MESMA transação', async () => {
    const { repo, passos } = montar();
    await repo.salvar(novoAgendamento() as any);

    expect(passos).toEqual([
      'abrir transação',
      'travar',
      'conferir conflito',
      'gravar',
      'fechar transação',
    ]);
  });

  // Sem a trava, as duas requisições conferem o conflito antes de qualquer
  // uma gravar, e as duas passam. Reproduzido antes da correção: dois 201.
  it('trava a agenda do profissional antes de conferir', async () => {
    const { repo, tx, passos } = montar();
    await repo.salvar(novoAgendamento() as any);

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(passos.indexOf('travar')).toBeLessThan(passos.indexOf('conferir conflito'));
  });

  it('remarcar passa pela mesma trava', async () => {
    const { repo, passos } = montar();
    await repo.reagendar(123, 7, AMANHA());

    expect(passos.indexOf('travar')).toBeLessThan(passos.indexOf('conferir conflito'));
    expect(passos.indexOf('conferir conflito')).toBeLessThan(passos.indexOf('gravar'));
  });

  it('profissional inválido nem abre transação', async () => {
    const { repo, prisma } = montar();
    await expect(
      repo.salvar({ ...novoAgendamento(), profissionalId: 0 } as any),
    ).rejects.toThrow('Profissional inválido.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('horário ocupado continua recusado, e não grava', async () => {
    const { repo, tx } = montar({
      existentes: [{ data: AMANHA(), servicos: [{ qtdeSlots: 1 }] }],
    });
    await expect(repo.salvar(novoAgendamento() as any)).rejects.toThrow(
      /já tem um atendimento/,
    );
    expect(tx.agendamento.create).not.toHaveBeenCalled();
  });
});
