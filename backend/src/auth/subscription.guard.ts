import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { testeGratisVigente } from '../assinatura/teste-gratis';

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

    // "active" (paga) e "trialing" (teste) permitem uso do sistema
    if (tenant.assinatura.status !== 'active' && tenant.assinatura.status !== 'trialing') {
      throw new ForbiddenException('Assinatura inativa. Renove sua assinatura para continuar usando o sistema.');
    }

    // Verificar se a assinatura não expirou
    const now = new Date();
    if (tenant.assinatura.dataFim < now) {
      throw new ForbiddenException('Assinatura expirada. Renove sua assinatura para continuar usando o sistema.');
    }

    // Durante os 30 dias de teste, qualquer plano escolhido recebe os limites
    // e recursos do Premium. O plano escolhido continua salvo porque ele é o
    // que será cobrado caso o dono decida continuar depois do teste.
    let planoEfetivo = tenant.assinatura.plano;
    if (testeGratisVigente(tenant.assinatura, now)) {
      const premium = await this.prisma.plano.findFirst({
        where: { nome: 'Premium', ativo: true },
      });
      if (!premium) {
        throw new ForbiddenException(
          'O acesso Premium do teste grátis está temporariamente indisponível.',
        );
      }
      planoEfetivo = premium;
    }

    // Adicionar informações do plano ao request para uso posterior
    request.tenant = tenant;
    request.plano = planoEfetivo;

    return true;
  }
}
