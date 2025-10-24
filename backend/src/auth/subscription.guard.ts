import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('Tenant não identificado');
    }

    // Verificar se o tenant tem assinatura ativa
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant não encontrado');
    }

    if (!tenant.assinatura) {
      throw new ForbiddenException('Assinatura não encontrada');
    }

    // Verificar se a assinatura está ativa
    if (tenant.assinatura.status !== 'active') {
      throw new ForbiddenException('Assinatura inativa. Renove sua assinatura para continuar usando o sistema.');
    }

    // Verificar se a assinatura não expirou
    const now = new Date();
    if (tenant.assinatura.dataFim < now) {
      throw new ForbiddenException('Assinatura expirada. Renove sua assinatura para continuar usando o sistema.');
    }

    // Adicionar informações do plano ao request para uso posterior
    request.tenant = tenant;
    request.plano = tenant.assinatura.plano;

    return true;
  }
}
