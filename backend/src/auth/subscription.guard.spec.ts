import { ForbiddenException } from '@nestjs/common';
import { SubscriptionGuard } from './subscription.guard';

function contexto(request: any): any {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

describe('SubscriptionGuard', () => {
  const assinatura = {
    status: 'trialing',
    dataFim: new Date(Date.now() + 24 * 60 * 60 * 1000),
    plano: { id: 1, nome: 'Básico', ativo: true, maxUsuarios: 1 },
  };

  it('injeta o Premium como plano efetivo para qualquer teste vigente', async () => {
    const premium = { id: 3, nome: 'Premium', ativo: true, maxUsuarios: 999999 };
    const prisma = {
      tenant: { findUnique: jest.fn(async () => ({ id: 7, assinatura })) },
      plano: { findFirst: jest.fn(async () => premium) },
    };
    const request: any = { user: { tenantId: 7 } };
    const guard = new SubscriptionGuard(prisma as any);

    await expect(guard.canActivate(contexto(request))).resolves.toBe(true);
    expect(prisma.plano.findFirst).toHaveBeenCalledWith({
      where: { nome: 'Premium', ativo: true },
    });
    expect(request.plano).toBe(premium);
  });

  it('bloqueia assinatura expirada', async () => {
    const prisma = {
      tenant: {
        findUnique: jest.fn(async () => ({
          id: 7,
          assinatura: { ...assinatura, dataFim: new Date(Date.now() - 1000) },
        })),
      },
      plano: { findFirst: jest.fn() },
    };
    const guard = new SubscriptionGuard(prisma as any);

    await expect(
      guard.canActivate(contexto({ user: { tenantId: 7 } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.plano.findFirst).not.toHaveBeenCalled();
  });
});
