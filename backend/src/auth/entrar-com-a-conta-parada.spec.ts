import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * Duas situações que pareciam a mesma, e não são.
 *
 * **Suspensão** é a alavanca do admin do SaaS: barra, e barra na hora — no
 * login e no token de quem já estava dentro. O que mudou é que ela parou de
 * mentir. Dizer "Credenciais inválidas" fazia o dono ficar digitando a senha
 * certa achando que tinha esquecido, sem nunca descobrir o motivo nem com
 * quem falar. Agora a senha é conferida primeiro: quem prova ser o dono ouve
 * a verdade, e quem chuta continua ouvindo "credenciais inválidas".
 *
 * **Assinatura vencida ou não escolhida** não barra nada. Entrar é o começo
 * de voltar a pagar, e quem se cadastrava pelo anúncio e fechava a aba antes
 * de escolher o plano perdia a conta que acabara de criar — conta feita,
 * senha certa, nenhum caminho de volta. O que essa pessoa pode FAZER lá
 * dentro é com o SubscriptionGuard, que rebaixa para o plano de entrada.
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
  it('barbearia suspensa NÃO entra — suspender tem que barrar', async () => {
    const prisma = await prismaComTenant(SUSPENSA);
    await expect(
      servico(prisma).loginTenant('dono@latita.app', SENHA),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('mas quem sabe a senha ouve o motivo, e não "credenciais inválidas"', async () => {
    const prisma = await prismaComTenant(SUSPENSA);
    await expect(
      servico(prisma).loginTenant('dono@latita.app', SENHA),
    ).rejects.toThrow(/suspensa/i);
  });

  it('quem NÃO sabe a senha não descobre nada sobre a barbearia', async () => {
    // A frase que conta o estado só aparece depois da senha conferir.
    const prisma = await prismaComTenant(SUSPENSA);
    await expect(
      servico(prisma).loginTenant('dono@latita.app', 'chute'),
    ).rejects.toThrow(/credenciais inválidas/i);
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

  it('barbearia com plano VENCIDO entra — vencer não é suspender', async () => {
    const prisma = await prismaComTenant({
      ...SEM_PLANO,
      id: 91,
      assinatura: {
        status: 'active',
        dataFim: new Date('2020-01-01'),
        plano: { id: 3, nome: 'Premium', ativo: true },
      },
    });
    const resposta: any = await servico(prisma).loginTenant('novo@exemplo.com', SENHA);
    expect(resposta.access_token).toBeTruthy();
  });
});

describe('token do dono com a conta parada', () => {
  function estrategia(tenant: any) {
    const prisma: any = { tenant: { findUnique: jest.fn(async () => tenant) } };
    return new JwtStrategy(prisma);
  }

  it('suspender derruba na hora quem já estava logado', async () => {
    // Sem isto, o dono suspenso seguia trabalhando até o token vencer, e a
    // suspensão deixaria de ter efeito imediato.
    const tenant = { ...SUSPENSA, senha: 'hash', sessaoId: 'sessao-1' };
    await expect(
      estrategia(tenant).validate({
        id: 14, tenantId: 14, tipo: 'tenant', sid: 'sessao-1',
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('mas plano vencido mantém o token — quem decide isso é o SubscriptionGuard', async () => {
    const tenant = {
      ...SEM_PLANO, id: 91, senha: 'hash', sessaoId: 'sessao-1',
      assinatura: { status: 'active', dataFim: new Date('2020-01-01'), plano: null },
    };
    const usuario: any = await estrategia(tenant).validate({
      id: 91, tenantId: 91, tipo: 'tenant', sid: 'sessao-1',
    } as any);
    expect(usuario.tenantId).toBe(91);
  });

  it('barbearia que não existe continua recusada', async () => {
    await expect(
      estrategia(null).validate({ id: 14, tenantId: 14, tipo: 'tenant', sid: 'x' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sessão derrubada continua derrubando', async () => {
    const tenant = { ...SEM_PLANO, id: 14, senha: 'hash', sessaoId: 'sessao-nova' };
    await expect(
      estrategia(tenant).validate({
        id: 14, tenantId: 14, tipo: 'tenant', sid: 'sessao-velha',
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
