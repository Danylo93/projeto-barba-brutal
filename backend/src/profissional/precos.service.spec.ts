import { PrecosProfissionalService } from './precos.service';

/**
 * Preço é dinheiro: quem pode mexer no preço de quem é regra de negócio, e
 * regra de negócio mora no backend. A tela do barbeiro só mostra o cadastro
 * dele, mas nada impede alguém chamar a API direto com outro id.
 */

/** Barbearia 1: Marcão (usuário 10) e Zé (usuário 11). Barbearia 9: o vizinho. */
const PROFISSIONAIS = [
  { id: 1, tenantId: 1, usuarioId: 10, nome: 'Marcão' },
  { id: 2, tenantId: 1, usuarioId: 11, nome: 'Zé' },
  { id: 3, tenantId: 9, usuarioId: 30, nome: 'Vizinho' },
];

/** `ativo: false` = serviço que o dono tirou do ar. */
const SERVICOS_DO_PROFISSIONAL: Record<
  number,
  { id: number; nome: string; preco: number; ativo: boolean }[]
> = {
  1: [
    { id: 100, nome: 'Corte', preco: 40, ativo: true },
    { id: 200, nome: 'Barba', preco: 25, ativo: true },
    { id: 300, nome: 'Hidratação', preco: 60, ativo: false },
  ],
  2: [{ id: 100, nome: 'Corte', preco: 40, ativo: true }],
  3: [{ id: 900, nome: 'Corte do vizinho', preco: 50, ativo: true }],
};

function fakePrisma() {
  const precos: any[] = [];
  const transacoes: any[] = [];

  const acharProfissional = (where: any) =>
    PROFISSIONAIS.find(
      (p) => p.id === where.id && (where.tenantId === undefined || p.tenantId === where.tenantId),
    ) ?? null;

  return {
    precos,
    transacoes,
    profissional: {
      findFirst: async ({ where, select }: any) => {
        const p = acharProfissional(where);
        if (!p) return null;
        const todos = SERVICOS_DO_PROFISSIONAL[p.id] ?? [];
        const resposta: any = {};
        if (select?.usuarioId) resposta.usuarioId = p.usuarioId;
        if (select?.servicos) {
          // Reproduz o `where: { ativo: true }` do Prisma: o serviço
          // desativado some da consulta, e é essa diferença que abria o furo.
          resposta.servicos = select.servicos.where?.ativo
            ? todos.filter((s) => s.ativo)
            : todos;
        }
        if (select?.precos) {
          resposta.precos = precos
            .filter((x) => x.profissionalId === p.id)
            .map((x) => ({ servicoId: x.servicoId, preco: x.preco }));
        }
        return resposta;
      },
    },
    precoProfissional: {
      deleteMany: ({ where }: any) => ({ tipo: 'delete', where }),
      upsert: ({ where, create, update }: any) => ({ tipo: 'upsert', where, create, update }),
    },
    $transaction: async (operacoes: any[]) => {
      for (const op of operacoes) {
        transacoes.push(op);
        if (op.tipo === 'delete') {
          const i = precos.findIndex(
            (x) =>
              x.profissionalId === op.where.profissionalId && x.servicoId === op.where.servicoId,
          );
          if (i >= 0) precos.splice(i, 1);
        } else {
          const chave = op.where.profissionalId_servicoId;
          const existente = precos.find(
            (x) => x.profissionalId === chave.profissionalId && x.servicoId === chave.servicoId,
          );
          if (existente) existente.preco = op.update.preco;
          else precos.push({ ...op.create });
        }
      }
      return [];
    },
  };
}

const DONO = { id: 1, tipo: 'tenant' as const, tenantId: 1 };
const MARCAO = { id: 10, tipo: 'usuario' as const, tenantId: 1, barbeiro: true };
const ZE = { id: 11, tipo: 'usuario' as const, tenantId: 1, barbeiro: true };
const CLIENTE = { id: 12, tipo: 'usuario' as const, tenantId: 1, barbeiro: false };

let prisma: ReturnType<typeof fakePrisma>;
let service: PrecosProfissionalService;

beforeEach(() => {
  prisma = fakePrisma();
  service = new PrecosProfissionalService(prisma as any);
});

describe('quem pode mudar o preço', () => {
  it('o próprio barbeiro pode', async () => {
    await expect(service.garantirPermissaoDeEscrita(1, 1, MARCAO)).resolves.toBeUndefined();
  });

  it('o dono da barbearia pode, em qualquer profissional dela', async () => {
    await expect(service.garantirPermissaoDeEscrita(1, 1, DONO)).resolves.toBeUndefined();
    await expect(service.garantirPermissaoDeEscrita(2, 1, DONO)).resolves.toBeUndefined();
  });

  it('barbeiro NÃO mexe no preço do colega', async () => {
    await expect(service.garantirPermissaoDeEscrita(2, 1, ZE)).resolves.toBeUndefined();
    await expect(service.garantirPermissaoDeEscrita(1, 1, ZE)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('cliente não mexe em preço nenhum', async () => {
    await expect(service.garantirPermissaoDeEscrita(1, 1, CLIENTE)).rejects.toMatchObject({
      status: 403,
    });
  });

  // O tenantId vem do token; o profissional de outra barbearia simplesmente
  // não existe para este usuário.
  it('não alcança profissional de outra barbearia', async () => {
    await expect(service.garantirPermissaoDeEscrita(3, 1, DONO)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('sem usuário autenticado, 403', async () => {
    await expect(service.garantirPermissaoDeEscrita(1, 1, undefined)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('tabela de preços', () => {
  it('lista os serviços que o profissional realiza com o preço da barbearia', async () => {
    const tabela = await service.tabela(1, 1);
    expect(tabela).toEqual([
      { servicoId: 100, nome: 'Corte', precoPadrao: 40, preco: 40, personalizado: false },
      { servicoId: 200, nome: 'Barba', precoPadrao: 25, preco: 25, personalizado: false },
    ]);
  });

  it('mostra o preço personalizado e mantém o padrão à vista', async () => {
    await service.salvar(1, 1, [{ servicoId: 100, preco: 70 }]);
    const tabela = await service.tabela(1, 1);
    expect(tabela[0]).toEqual({
      servicoId: 100,
      nome: 'Corte',
      precoPadrao: 40,
      preco: 70,
      personalizado: true,
    });
  });

  it('profissional de outra barbearia dá 404', async () => {
    await expect(service.tabela(3, 1)).rejects.toMatchObject({ status: 404 });
  });
});

describe('salvar preços', () => {
  it('grava o preço com o tenant do token', async () => {
    await service.salvar(1, 1, [{ servicoId: 100, preco: 70 }]);
    expect(prisma.precos).toEqual([
      { tenantId: 1, profissionalId: 1, servicoId: 100, preco: 70 },
    ]);
  });

  it('campo vazio apaga a personalização e volta ao preço da barbearia', async () => {
    await service.salvar(1, 1, [{ servicoId: 100, preco: 70 }]);
    await service.salvar(1, 1, [{ servicoId: 100, preco: null }]);
    expect(prisma.precos).toHaveLength(0);
    const tabela = await service.tabela(1, 1);
    expect(tabela[0].preco).toBe(40);
    expect(tabela[0].personalizado).toBe(false);
  });

  it('aceita preço digitado com vírgula', async () => {
    await service.salvar(1, 1, [{ servicoId: 100, preco: '55,50' }]);
    expect(prisma.precos[0].preco).toBe(55.5);
  });

  it('recusa preço de serviço que o profissional não realiza', async () => {
    await expect(service.salvar(2, 1, [{ servicoId: 200, preco: 30 }])).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.precos).toHaveLength(0);
  });

  // Sem esta checagem dava para criar preço em cima do serviço do vizinho.
  it('recusa serviço de outra barbearia', async () => {
    await expect(service.salvar(1, 1, [{ servicoId: 900, preco: 30 }])).rejects.toMatchObject({
      status: 400,
    });
  });

  it('recusa preço inválido antes de gravar qualquer linha', async () => {
    await expect(
      service.salvar(1, 1, [
        { servicoId: 100, preco: 50 },
        { servicoId: 200, preco: 'de graça' },
      ]),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.precos).toHaveLength(0);
  });

  it('recusa preço negativo', async () => {
    await expect(service.salvar(1, 1, [{ servicoId: 100, preco: -5 }])).rejects.toMatchObject({
      status: 400,
    });
  });

  it('grava tudo numa transação só', async () => {
    await service.salvar(1, 1, [
      { servicoId: 100, preco: 70 },
      { servicoId: 200, preco: 35 },
    ]);
    expect(prisma.transacoes).toHaveLength(2);
    expect(prisma.precos).toHaveLength(2);
  });

  it('corpo sem lista dá 400 em vez de 500', async () => {
    await expect(service.salvar(1, 1, undefined as any)).rejects.toMatchObject({ status: 400 });
  });

  // A tela não mostra serviço desativado, então o preço gravado aqui seria
  // invisível e impossível de corrigir — e voltaria a valer na reativação.
  it('recusa preço de serviço desativado', async () => {
    await expect(service.salvar(1, 1, [{ servicoId: 300, preco: 999 }])).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.precos).toHaveLength(0);
  });

  it('serviço desativado também não aparece na tabela', async () => {
    const tabela = await service.tabela(1, 1);
    expect(tabela.map((l) => l.servicoId)).toEqual([100, 200]);
  });

  it('booleano no preço dá 400, não vira R$ 1,00', async () => {
    await expect(
      service.salvar(1, 1, [{ servicoId: 100, preco: true as any }]),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.precos).toHaveLength(0);
  });
});
