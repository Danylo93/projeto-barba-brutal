import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * O dono tem que conseguir ENTRAR para poder voltar a pagar.
 *
 * Três portas estavam fechadas ao mesmo tempo, e as três diziam coisas
 * diferentes da verdade:
 *
 * 1. barbearia suspensa pelo admin recebia "Credenciais inválidas" — o dono
 *    ficava trocando a senha certa, achando que tinha esquecido;
 * 2. barbearia sem plano escolhido recebia 400 no login. Quem se cadastrava
 *    pelo anúncio e fechava a aba antes de escolher o plano não entrava mais.
 *    Conta criada, senha certa, e nenhum caminho de volta;
 * 3. e mesmo passando pelas duas, o token era recusado em TODA requisição
 *    seguinte, porque a estratégia do JWT também exigia `ativo`.
 *
 * Identidade e permissão são coisas diferentes. Aqui se confere quem é a
 * pessoa; o que ela pode fazer lá dentro é com o SubscriptionGuard, que
 * rebaixa para o plano de entrada e deixa a tela oferecer o plano.
 */

const SENHA = '#Senha123';

// A estratégia do passport recusa nascer sem segredo.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';

async function prismaComTenant(tenant: any) {
  const hash = await bcrypt.hash(SENHA, 10);
  const completo = { senha: hash, sessaoId: null, ...tenant };
  return {
    tenant: {
      findUnique: jest.fn(async () => completo),
      update: jest.fn(async ({ data }: any) => Object.assign(completo, data)),
    },
    usuario: { findMany: jest.fn(async () => []) },
    admin: { findUnique: jest.fn(async () => null) },
    completo,
  };
}

function servico(prisma: any) {
  const jwt: any = { sign: jest.fn(() => 'token-de-teste') };
  return new AuthService(prisma as any, jwt, {} as any, {} as any);
}

const SUSPENSA = {
  id: 14,
  nome: 'Lá Tita',
  email: 'dono@latita.app',
  ativo: false,
  assinatura: {
    status: 'active',
    dataFim: new Date('2099-01-01'),
    plano: { id: 3, nome: 'Premium', ativo: true },
  },
};

const SEM_PLANO = {
  id: 90,
  nome: 'Recém-cadastrada',
  email: 'novo@exemplo.com',
  ativo: true,
  assinatura: null,
};

describe('login do dono com a conta parada', () => {
  it('barbearia suspensa entra — a senha está certa', async () => {
    const prisma = await prismaComTenant(SUSPENSA);
    const resposta: any = await servico(prisma).loginTenant('dono@latita.app', SENHA);

    expect(resposta.access_token).toBeTruthy();
    expect(resposta.tenant.id).toBe(14);
  });

  it('barbearia sem plano escolhido também entra', async () => {
    // É o caso de quem chega pelo anúncio, se cadastra e fecha a aba antes de
    // escolher o plano. Sem isto, o lead morre no login.
    const prisma = await prismaComTenant(SEM_PLANO);
    const resposta: any = await servico(prisma).loginTenant('novo@exemplo.com', SENHA);

    expect(resposta.access_token).toBeTruthy();
  });

  it('senha errada continua sendo senha errada', async () => {
    const prisma = await prismaComTenant(SUSPENSA);
    await expect(
      servico(prisma).loginTenant('dono@latita.app', 'chute'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('e-mail que não existe continua recusado', async () => {
    const prisma = await prismaComTenant(SUSPENSA);
    prisma.tenant.findUnique = jest.fn(async () => null) as any;
    await expect(
      servico(prisma).loginTenant('ninguem@exemplo.com', SENHA),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a resposta diz que a barbearia está suspensa, para a tela reagir', async () => {
    const prisma = await prismaComTenant(SUSPENSA);
    const resposta: any = await servico(prisma).loginTenant('dono@latita.app', SENHA);
    expect(resposta.tenant.ativo).toBe(false);
  });
});

describe('token do dono com a conta parada', () => {
  function estrategia(tenant: any) {
    const prisma: any = { tenant: { findUnique: jest.fn(async () => tenant) } };
    return new JwtStrategy(prisma);
  }

  it('o token continua valendo com a barbearia suspensa', async () => {
    // Sem isto, o dono entrava e era jogado para fora na primeira tela: toda
    // requisição seguinte voltava 401.
    const tenant = { ...SUSPENSA, senha: 'hash', sessaoId: 'sessao-1' };
    const usuario: any = await estrategia(tenant).validate({
      id: 14, tenantId: 14, tipo: 'tenant', sid: 'sessao-1',
    } as any);

    expect(usuario.tenantId).toBe(14);
    expect(usuario.ativo).toBe(false);
  });

  it('barbearia que não existe continua recusada', async () => {
    await expect(
      estrategia(null).validate({ id: 14, tenantId: 14, tipo: 'tenant', sid: 'x' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sessão derrubada continua derrubando, mesmo suspensa', async () => {
    const tenant = { ...SUSPENSA, senha: 'hash', sessaoId: 'sessao-nova' };
    await expect(
      estrategia(tenant).validate({
        id: 14, tenantId: 14, tipo: 'tenant', sid: 'sessao-velha',
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
