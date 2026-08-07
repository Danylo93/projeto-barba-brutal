import { ForbiddenException } from '@nestjs/common';
import { SubscriptionGuard } from './subscription.guard';

function contexto(request: any): any {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

const BASICO = { id: 1, nome: 'Básico', ativo: true, maxUsuarios: 1, features: ['agendamentos'] };
const PREMIUM = { id: 3, nome: 'Premium', ativo: true, maxUsuarios: 999999, features: ['agendamentos', 'robo-whatsapp'] };

function prismaFalso(assinatura: any, planos: any[] = [BASICO, PREMIUM]) {
  return {
    tenant: { findUnique: jest.fn(async () => ({ id: 7, assinatura })) },
    plano: {
      findFirst: jest.fn(async ({ where }: any) =>
        planos.find((p) => p.nome === where.nome) ?? null,
      ),
    },
  };
}

const daquiAUmDia = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const ontem = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

describe('SubscriptionGuard', () => {
  describe('assinatura em dia', () => {
    it('injeta o Premium como plano efetivo para qualquer teste vigente', async () => {
      const prisma = prismaFalso({
        status: 'trialing',
        dataFim: daquiAUmDia(),
        plano: BASICO,
      });
      const request: any = { user: { tenantId: 7 } };
      const guard = new SubscriptionGuard(prisma as any);

      await expect(guard.canActivate(contexto(request))).resolves.toBe(true);
      expect(request.plano).toBe(PREMIUM);
      expect(request.assinaturaInativa).toBe(false);
    });

    it('assinatura paga usa o plano contratado', async () => {
      const prisma = prismaFalso({ status: 'active', dataFim: daquiAUmDia(), plano: PREMIUM });
      const request: any = { user: { tenantId: 7 } };

      await expect(
        new SubscriptionGuard(prisma as any).canActivate(contexto(request)),
      ).resolves.toBe(true);
      expect(request.plano).toBe(PREMIUM);
      expect(request.assinaturaInativa).toBe(false);
    });
  });

  /**
   * Plano vencido não é porta fechada.
   *
   * O sistema devolvia 403 em TODA rota da barbearia assim que o teste
   * acabava: o dono não via a agenda do dia seguinte, não abria a lista de
   * clientes, não conseguia nem olhar o que tinha. Quem chega por anúncio e
   * bate nessa parede não vira assinante, desinstala.
   *
   * Agora ele entra e continua trabalhando no que o plano de entrada dá — o
   * que fica de fora é o que se paga para ter. É isso que dá argumento para a
   * tela de upsell: ela mostra o que ele está deixando na mesa, em vez de
   * anunciar uma catraca.
   */
  describe('assinatura vencida ou inativa', () => {
    it.each([
      ['expirada', { status: 'active', dataFim: ontem(), plano: PREMIUM }],
      ['cancelada', { status: 'canceled', dataFim: daquiAUmDia(), plano: PREMIUM }],
      ['teste que acabou', { status: 'trialing', dataFim: ontem(), plano: PREMIUM }],
      ['pagamento pendente', { status: 'past_due', dataFim: daquiAUmDia(), plano: PREMIUM }],
    ])('deixa entrar com %s', async (_caso, assinatura) => {
      const prisma = prismaFalso(assinatura);
      const request: any = { user: { tenantId: 7 } };

      await expect(
        new SubscriptionGuard(prisma as any).canActivate(contexto(request)),
      ).resolves.toBe(true);
      expect(request.assinaturaInativa).toBe(true);
    });

    it('cai para o plano de entrada, não mantém o Premium de graça', async () => {
      const prisma = prismaFalso({ status: 'canceled', dataFim: ontem(), plano: PREMIUM });
      const request: any = { user: { tenantId: 7 } };

      await new SubscriptionGuard(prisma as any).canActivate(contexto(request));
      expect(request.plano).toBe(BASICO);
      expect(request.plano.features).not.toContain('robo-whatsapp');
    });

    it('barbearia sem assinatura nenhuma também entra', async () => {
      // Cadastro que travou no meio: a conta existe, a assinatura não. Antes
      // era 403 sem saída — nem a tela de planos abria.
      const prisma = prismaFalso(null);
      const request: any = { user: { tenantId: 7 } };

      await expect(
        new SubscriptionGuard(prisma as any).canActivate(contexto(request)),
      ).resolves.toBe(true);
      expect(request.assinaturaInativa).toBe(true);
      expect(request.plano).toBe(BASICO);
    });

    it('sem plano de entrada cadastrado, entra sem plano em vez de derrubar', async () => {
      // Não é o dono que tem que pagar por seed faltando no nosso lado.
      const prisma = prismaFalso({ status: 'canceled', dataFim: ontem(), plano: PREMIUM }, []);
      const request: any = { user: { tenantId: 7 } };

      await expect(
        new SubscriptionGuard(prisma as any).canActivate(contexto(request)),
      ).resolves.toBe(true);
      expect(request.assinaturaInativa).toBe(true);
    });
  });

  describe('o que continua barrado', () => {
    it('requisição sem barbearia no token', async () => {
      const prisma = prismaFalso(null);
      await expect(
        new SubscriptionGuard(prisma as any).canActivate(contexto({ user: {} })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('barbearia que não existe', async () => {
      const prisma: any = {
        tenant: { findUnique: jest.fn(async () => null) },
        plano: { findFirst: jest.fn() },
      };
      await expect(
        new SubscriptionGuard(prisma).canActivate(contexto({ user: { tenantId: 7 } })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
