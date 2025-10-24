import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class LimitsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;
    const plano = request.plano;

    if (!tenant || !plano) {
      throw new ForbiddenException('Informações do tenant não encontradas');
    }

    // Verificar limite de usuários
    const userCount = await this.prisma.usuario.count({
      where: { tenantId: tenant.id, ativo: true },
    });

    if (userCount >= plano.maxUsuarios) {
      throw new ForbiddenException(
        `Limite de usuários excedido. Seu plano permite até ${plano.maxUsuarios} usuários. Faça upgrade do seu plano para adicionar mais usuários.`
      );
    }

    // Verificar limite de agendamentos (mensal)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const agendamentoCount = await this.prisma.agendamento.count({
      where: {
        tenantId: tenant.id,
        data: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    if (agendamentoCount >= plano.maxAgendamentos) {
      throw new ForbiddenException(
        `Limite de agendamentos mensais excedido. Seu plano permite até ${plano.maxAgendamentos} agendamentos por mês. Faça upgrade do seu plano para aumentar o limite.`
      );
    }

    return true;
  }
}
