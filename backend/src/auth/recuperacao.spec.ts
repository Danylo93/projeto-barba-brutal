import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { RecuperacaoService } from './recuperacao.service';

/**
 * Prisma de mentira, só com o que a recuperação usa. A ideia não é testar o
 * banco: é travar as regras que, se quebrarem, viram conta invadida —
 * token em texto puro, link reutilizável, link eterno e vazamento de e-mail.
 */
interface FakePrisma {
  pedidos: any[];
  tenants: any[];
  usuarios: any[];
  senhasGravadas: { tabela: string; id: number; senha: string }[];
  [chave: string]: any;
}

function fakePrisma(): FakePrisma {
  const pedidos: any[] = [];
  const tenants: any[] = [];
  const usuarios: any[] = [];
  const senhasGravadas: { tabela: string; id: number; senha: string }[] = [];
  let proximoId = 1;

  return {
    pedidos,
    tenants,
    usuarios,
    senhasGravadas,
    tenant: {
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          tenants.find((t) => t.email === where.email && t.ativo) ?? null,
        ),
      ),
      update: jest.fn(({ where, data }: any) => {
        senhasGravadas.push({ tabela: 'tenant', id: where.id, senha: data.senha });
        return Promise.resolve({});
      }),
    },
    usuario: {
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          usuarios.find(
            (u) =>
              u.email === where.email &&
              u.ativo &&
              (where.tenantId === undefined || u.tenantId === where.tenantId),
          ) ?? null,
        ),
      ),
      update: jest.fn(({ where, data }: any) => {
        senhasGravadas.push({ tabela: 'usuario', id: where.id, senha: data.senha });
        return Promise.resolve({});
      }),
    },
    recuperacaoSenha: {
      create: jest.fn(({ data }: any) => {
        const novo = { id: proximoId++, usadoEm: null, ...data };
        pedidos.push(novo);
        return Promise.resolve(novo);
      }),
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          pedidos.find(
            (p) =>
              p.tokenHash === where.tokenHash &&
              p.usadoEm === null &&
              p.expiraEm > where.expiraEm.gt,
          ) ?? null,
        ),
      ),
      deleteMany: jest.fn(({ where }: any) => {
        for (let i = pedidos.length - 1; i >= 0; i--) {
          const p = pedidos[i];
          if (
            p.titularTipo === where.titularTipo &&
            p.titularId === where.titularId &&
            p.usadoEm === null
          ) {
            pedidos.splice(i, 1);
          }
        }
        return Promise.resolve({ count: 0 });
      }),
      update: jest.fn(({ where, data }: any) => {
        const p = pedidos.find((x) => x.id === where.id);
        if (p) Object.assign(p, data);
        return Promise.resolve(p);
      }),
    },
    // As operações do serviço já rodaram quando chegam aqui: basta aguardar.
    $transaction: jest.fn((ops: Promise<any>[]) => Promise.all(ops)),
  };
}

let prisma: FakePrisma;
let enviados: { para: string; email: any }[];
let service: RecuperacaoService;

const notificacao = {
  enviarTemplate: jest.fn((para: string, email: any) => {
    enviados.push({ para, email });
    return Promise.resolve();
  }),
  // Espelha o serviço de verdade: dispara e engole a falha, sem devolver
  // promessa para o chamador esperar.
  enviarTemplateEmSegundoPlano: jest.fn((para: string, email: any) => {
    notificacao.enviarTemplate(para, email).catch(() => undefined);
  }),
  emailAtivo: true,
};

/** Pega o token do link que foi para o e-mail — é o que o barbeiro clica. */
function tokenDoUltimoEmail(): string {
  const link = enviados[enviados.length - 1].email.texto;
  return /token=([a-f0-9]+)/.exec(link)![1];
}

beforeEach(() => {
  prisma = fakePrisma();
  enviados = [];
  notificacao.enviarTemplate.mockClear();
  notificacao.enviarTemplateEmSegundoPlano.mockClear();
  process.env.FRONTEND_URL = 'https://barbeariabrutal.vercel.app';
  service = new RecuperacaoService(prisma as any, notificacao as any);
});

describe('RecuperacaoService.solicitar', () => {
  it('responde igual com ou sem conta — senão vira lista de e-mails cadastrados', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });

    const existe = await service.solicitar('marcao@x.app');
    const naoExiste = await service.solicitar('ninguem@x.app');

    expect(existe).toEqual(naoExiste);
    expect(enviados).toHaveLength(1);
  });

  it('não cria pedido para e-mail sem conta', async () => {
    await service.solicitar('ninguem@x.app');
    expect(prisma.pedidos).toHaveLength(0);
  });

  it('grava só o hash do token, nunca o token do link', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    await service.solicitar('marcao@x.app');

    const token = tokenDoUltimoEmail();
    const guardado = prisma.pedidos[0].tokenHash;
    expect(guardado).not.toBe(token);
    expect(guardado).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('aceita e-mail com espaço e maiúscula', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    await service.solicitar('  MARCAO@X.APP  ');
    expect(prisma.pedidos).toHaveLength(1);
  });

  it('ignora conta desativada', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: false });
    await service.solicitar('marcao@x.app');
    expect(prisma.pedidos).toHaveLength(0);
  });

  it('pedir de novo invalida o link anterior', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    await service.solicitar('marcao@x.app');
    const primeiro = tokenDoUltimoEmail();
    await service.solicitar('marcao@x.app');

    expect(prisma.pedidos).toHaveLength(1);
    await expect(service.redefinir(primeiro, 'novaSenha1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('o link do cliente carrega o tenant — senão ele cai no login errado', async () => {
    prisma.usuarios.push({
      id: 7,
      nome: 'João',
      email: 'joao@x.app',
      tenantId: 3,
      ativo: true,
    });
    await service.solicitar('joao@x.app');
    expect(enviados[0].email.texto).toContain('&tenant=3');
  });

  it('o link do dono não leva tenant', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    await service.solicitar('marcao@x.app');
    expect(enviados[0].email.texto).not.toContain('tenant=');
  });

  it('manda o e-mail para o endereço cadastrado', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    await service.solicitar('marcao@x.app');
    expect(enviados[0].para).toBe('marcao@x.app');
  });

  it('e-mail vazio não estoura', async () => {
    await expect(service.solicitar('')).resolves.toHaveProperty('ok', true);
    expect(prisma.pedidos).toHaveLength(0);
  });

  /*
   * Estes dois travam um bug que chegou a produção: a resposta esperava o
   * SMTP. Com o servidor fora do ar, e-mail COM conta pendurava 2 minutos e
   * terminava em 500, enquanto e-mail SEM conta respondia na hora. A diferença
   * entregava quais e-mails têm cadastro — o oposto do que a mensagem
   * genérica promete.
   */
  it('não espera o e-mail sair para responder', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });

    let liberar: () => void = () => undefined;
    const travado = new Promise<void>((r) => (liberar = r));
    notificacao.enviarTemplate.mockReturnValueOnce(travado as any);

    // Sem timeout de teste: se voltasse a esperar, isto nunca resolveria.
    await expect(service.solicitar('marcao@x.app')).resolves.toHaveProperty('ok', true);
    liberar();
  });

  it('SMTP quebrado não vira erro para quem pediu', async () => {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    notificacao.enviarTemplate.mockRejectedValueOnce(new Error('ECONNREFUSED') as any);

    const comConta = await service.solicitar('marcao@x.app');
    const semConta = await service.solicitar('ninguem@x.app');

    // Mesma resposta nos dois casos, mesmo com o envio falhando.
    expect(comConta).toEqual(semConta);
    // E o pedido continua gravado: o link existe se o suporte precisar reenviar.
    expect(prisma.pedidos).toHaveLength(1);
  });
});

describe('RecuperacaoService.redefinir', () => {
  async function pedirParaTenant() {
    prisma.tenants.push({ id: 1, nome: 'Marcão', email: 'marcao@x.app', ativo: true });
    await service.solicitar('marcao@x.app');
    return tokenDoUltimoEmail();
  }

  it('troca a senha e grava o hash, nunca o texto puro', async () => {
    const token = await pedirParaTenant();
    await service.redefinir(token, 'SenhaNova123');

    const gravada = prisma.senhasGravadas[0];
    expect(gravada.tabela).toBe('tenant');
    expect(gravada.id).toBe(1);
    expect(gravada.senha).not.toBe('SenhaNova123');
    expect(await bcrypt.compare('SenhaNova123', gravada.senha)).toBe(true);
  });

  it('o mesmo link não serve duas vezes', async () => {
    const token = await pedirParaTenant();
    await service.redefinir(token, 'SenhaNova123');
    await expect(service.redefinir(token, 'OutraSenha1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('link expirado não vale', async () => {
    const token = await pedirParaTenant();
    prisma.pedidos[0].expiraEm = new Date(Date.now() - 1000);
    await expect(service.redefinir(token, 'SenhaNova123')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('token inventado não vale', async () => {
    await pedirParaTenant();
    await expect(service.redefinir('deadbeef', 'SenhaNova123')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('token vazio não vale', async () => {
    await expect(service.redefinir('', 'SenhaNova123')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('recusa senha curta antes de queimar o token', async () => {
    const token = await pedirParaTenant();
    await expect(service.redefinir(token, '123')).rejects.toThrow(BadRequestException);
    // O link ainda tem que funcionar: errar o tamanho da senha não pode
    // obrigar o barbeiro a pedir tudo de novo.
    await expect(service.redefinir(token, 'SenhaNova123')).resolves.toHaveProperty(
      'ok',
      true,
    );
  });

  it('funciona para cliente/barbeiro, não só para o dono', async () => {
    prisma.usuarios.push({
      id: 7,
      nome: 'João',
      email: 'joao@x.app',
      tenantId: 3,
      ativo: true,
    });
    await service.solicitar('joao@x.app');
    await service.redefinir(tokenDoUltimoEmail(), 'SenhaNova123');

    expect(prisma.senhasGravadas[0].tabela).toBe('usuario');
    expect(prisma.senhasGravadas[0].id).toBe(7);
  });
});
