import { HttpException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsuarioMiddleware } from './usuario.middleware';

/**
 * Trava os quatro furos que este middleware tinha, todos provados rodando
 * antes da correção:
 *
 * - identidade resolvida para a barbearia errada (busca por e-mail sem tenant)
 * - dono da barbearia levando 401 em toda rota de agendamento
 * - token inválido virando 500 em vez de 401
 * - token de uma barbearia alcançando conta de outra
 */
const SEGREDO = 'segredo-de-teste';

/** Repositório de mentira que registra como foi consultado. */
function fakeRepo(contas: any[]) {
  return {
    consultas: [] as { id: number; tenantId: number }[],
    async buscarNoTenant(id: number, tenantId: number) {
      this.consultas.push({ id, tenantId });
      return contas.find((c) => c.id === id && c.tenantId === tenantId && c.ativo) ?? null;
    },
    async buscarPorEmail() {
      throw new Error('não deve ser usado para resolver o usuário logado');
    },
    async salvar() {},
  };
}

function requisicao(token?: string) {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} } as any;
}

const assinar = (payload: any) => jwt.sign(payload, SEGREDO);

let avancou: boolean;
const next = () => {
  avancou = true;
};

beforeEach(() => {
  process.env.JWT_SECRET = SEGREDO;
  avancou = false;
});

describe('UsuarioMiddleware', () => {
  // O caso que quebrava: mesmo e-mail em duas barbearias.
  const contas = [
    { id: 2, nome: 'João da A', email: 'joao@x.app', tenantId: 1, barbeiro: false, ativo: true },
    { id: 57, nome: 'João da B', email: 'joao@x.app', tenantId: 9, barbeiro: false, ativo: true },
  ];

  it('resolve a conta da barbearia do token, não a primeira com aquele e-mail', async () => {
    const repo = fakeRepo(contas);
    const mw = new UsuarioMiddleware(repo as any);
    const req = requisicao(assinar({ id: 57, tenantId: 9, tipo: 'usuario', email: 'joao@x.app' }));

    await mw.use(req, {} as any, next);

    expect(avancou).toBe(true);
    expect(req.usuario.id).toBe(57);
    expect(req.usuario.tenantId).toBe(9);
    // E consultou com o tenant, não só com o e-mail.
    expect(repo.consultas).toEqual([{ id: 57, tenantId: 9 }]);
  });

  it('não alcança conta de outra barbearia mesmo com o id certo', async () => {
    const repo = fakeRepo(contas);
    const mw = new UsuarioMiddleware(repo as any);
    // Token da barbearia 9 apontando para a conta 2, que é da barbearia 1.
    const req = requisicao(assinar({ id: 2, tenantId: 9, tipo: 'usuario', email: 'joao@x.app' }));

    await expect(mw.use(req, {} as any, next)).rejects.toThrow(HttpException);
    expect(avancou).toBe(false);
  });

  // O dono só existe na tabela `tenant`; procurar em `usuario` dava 401 e
  // deixava o caminho `tipo === 'tenant'` do controller inalcançável.
  it('deixa o dono da barbearia passar, sem procurar em usuario', async () => {
    const repo = fakeRepo(contas);
    const mw = new UsuarioMiddleware(repo as any);
    const req = requisicao(assinar({ id: 3, tenantId: 3, tipo: 'tenant', email: 'dono@x.app' }));

    await mw.use(req, {} as any, next);

    expect(avancou).toBe(true);
    expect(req.usuario.tipo).toBe('tenant');
    expect(req.usuario.tenantId).toBe(3);
    expect(req.usuario.barbeiro).toBe(false);
    expect(repo.consultas).toHaveLength(0);
  });

  it('marca o tipo do cliente, que o controller usa para decidir permissão', async () => {
    const repo = fakeRepo(contas);
    const mw = new UsuarioMiddleware(repo as any);
    const req = requisicao(assinar({ id: 2, tenantId: 1, tipo: 'usuario', email: 'joao@x.app' }));

    await mw.use(req, {} as any, next);
    expect(req.usuario.tipo).toBe('usuario');
  });

  it('token inválido vira 401, não 500', async () => {
    const mw = new UsuarioMiddleware(fakeRepo(contas) as any);
    const req = requisicao('isto.nao.e.um.token');

    await expect(mw.use(req, {} as any, next)).rejects.toMatchObject({ status: 401 });
  });

  it('token assinado com outro segredo é recusado', async () => {
    const mw = new UsuarioMiddleware(fakeRepo(contas) as any);
    const req = requisicao(jwt.sign({ id: 2, tenantId: 1, tipo: 'usuario' }, 'outro-segredo'));

    await expect(mw.use(req, {} as any, next)).rejects.toMatchObject({ status: 401 });
  });

  it('sem token, 401', async () => {
    const mw = new UsuarioMiddleware(fakeRepo(contas) as any);
    await expect(mw.use(requisicao(), {} as any, next)).rejects.toMatchObject({ status: 401 });
  });

  it('conta desativada não entra', async () => {
    const repo = fakeRepo([{ ...contas[0], ativo: false }]);
    const mw = new UsuarioMiddleware(repo as any);
    const req = requisicao(assinar({ id: 2, tenantId: 1, tipo: 'usuario', email: 'joao@x.app' }));

    await expect(mw.use(req, {} as any, next)).rejects.toMatchObject({ status: 401 });
  });

  it('admin do SaaS não movimenta agenda de barbearia', async () => {
    const mw = new UsuarioMiddleware(fakeRepo(contas) as any);
    const req = requisicao(assinar({ id: 1, tipo: 'admin', email: 'admin@x.app' }));

    await expect(mw.use(req, {} as any, next)).rejects.toMatchObject({ status: 403 });
  });

  it('token de cliente sem barbearia é recusado', async () => {
    const mw = new UsuarioMiddleware(fakeRepo(contas) as any);
    const req = requisicao(assinar({ id: 2, tipo: 'usuario', email: 'joao@x.app' }));

    await expect(mw.use(req, {} as any, next)).rejects.toMatchObject({ status: 401 });
  });
});
