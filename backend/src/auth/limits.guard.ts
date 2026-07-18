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

    if (request.method !== 'POST') {
      return true; // Só bloquear novas criações, não visualização
    }

    if (!tenant || !plano) {
      throw new ForbiddenException('Informações do tenant não encontradas');
    }

    const path = request.url;

    // Verificar limite de barbeiros apenas quando for criar um novo profissional
    if (path.includes('/profissionais')) {
      const barbeirosCount = await this.prisma.usuario.count({
        where: { tenantId: tenant.id, ativo: true, barbeiro: true },
      });

      if (barbeirosCount >= plano.maxUsuarios) {
        throw new ForbiddenException(
          `Limite de barbeiros excedido. Seu plano permite até ${plano.maxUsuarios} barbeiro(s). Faça upgrade do plano para adicionar mais.`
        );
      }
    }

    // Verificar limite de agendamentos apenas quando for criar um novo agendamento
    if (path.includes('/agendamentos')) {
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
    }

    return true;
  }
}
