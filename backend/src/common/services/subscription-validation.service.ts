import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

/**
 * Serviço para validar status de assinatura/plano
 * Verifica se um tenant tem um plano ativo e válido
 */
@Injectable()
export class SubscriptionValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se um tenant tem uma assinatura ativa
   * @param tenantId - ID do tenant
   * @returns Assinatura com plano incluído
   * @throws BadRequestException se não houver assinatura ativa
   */
  async validateTenantSubscription(tenantId: number) {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
      include: {
        plano: true,
        tenant: true,
      },
    });

    // Verificar se existe assinatura
    if (!assinatura) {
      throw new BadRequestException(
        'Sua barbearia não possui um plano ativo. Por favor, adquira um plano para continuar.',
      );
    }

    // "active" (paga) e "trialing" (período de teste) são válidos
    if (assinatura.status !== 'active' && assinatura.status !== 'trialing') {
      throw new BadRequestException(
        `Sua assinatura está com status "${assinatura.status}". Por favor, regularize sua situação para continuar.`,
      );
    }

    // Verificar se a data de fim ainda não passou
    const agora = new Date();
    if (assinatura.dataFim < agora) {
      throw new BadRequestException(
        'Sua assinatura expirou. Por favor, renove seu plano para continuar.',
      );
    }

    // Verificar se o plano está ativo
    if (!assinatura.plano.ativo) {
      throw new BadRequestException(
        'O plano associado à sua assinatura não está mais disponível.',
      );
    }

    return assinatura;
  }

  /**
   * Valida se um tenant tem uma assinatura ativa (versão simplificada)
   * Retorna apenas true/false
   * @param tenantId - ID do tenant
   * @returns true se tem assinatura ativa, false caso contrário
   */
  async hasActiveSubscription(tenantId: number): Promise<boolean> {
    try {
      await this.validateTenantSubscription(tenantId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém informações da assinatura de um tenant
   * @param tenantId - ID do tenant
   * @returns Assinatura com plano ou null
   */
  async getSubscriptionInfo(tenantId: number) {
    return this.prisma.assinatura.findUnique({
      where: { tenantId },
      include: {
        plano: true,
      },
    });
  }

  /**
   * Verifica se a assinatura está próxima de expirar (nos próximos 7 dias)
   * @param tenantId - ID do tenant
   * @returns true se expira em menos de 7 dias
   */
  async isExpiringsoon(tenantId: number): Promise<boolean> {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
    });

    if (!assinatura) {
      return false;
    }

    const agora = new Date();
    const seteDialas = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

    return assinatura.dataFim <= seteDialas && assinatura.dataFim > agora;
  }

  /**
   * Obtém o status detalhado da assinatura
   * @param tenantId - ID do tenant
   * @returns Objeto com informações detalhadas do status
   */
  async getSubscriptionStatus(tenantId: number) {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
      include: {
        plano: true,
      },
    });

    if (!assinatura) {
      return {
        hasSubscription: false,
        isActive: false,
        message: 'Nenhuma assinatura encontrada',
      };
    }

    const agora = new Date();
    const isExpired = assinatura.dataFim < agora;
    const isExpiringsoon = this.isExpiringInDays(assinatura.dataFim, 7);

    const statusValido = assinatura.status === 'active' || assinatura.status === 'trialing'
    return {
      hasSubscription: true,
      isActive: statusValido && !isExpired,
      emTeste: assinatura.status === 'trialing' && !isExpired,
      status: assinatura.status,
      plano: assinatura.plano.nome,
      dataInicio: assinatura.dataInicio,
      dataFim: assinatura.dataFim,
      isExpired,
      isExpiringsoon,
      diasRestantes: this.getDaysRemaining(assinatura.dataFim),
      message: this.getStatusMessage(assinatura, isExpired, isExpiringsoon),
    };
  }

  /**
   * Verifica se uma data está dentro de X dias
   */
  private isExpiringInDays(dataFim: Date, dias: number): boolean {
    const agora = new Date();
    const futuro = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
    return dataFim <= futuro && dataFim > agora;
  }

  /**
   * Calcula dias restantes até expiração
   */
  private getDaysRemaining(dataFim: Date): number {
    const agora = new Date();
    const diferenca = dataFim.getTime() - agora.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  }

  /**
   * Gera mensagem de status apropriada
   */
  private getStatusMessage(
    assinatura: any,
    isExpired: boolean,
    isExpiringoon: boolean,
  ): string {
    if (isExpired) {
      return 'Sua assinatura expirou. Por favor, renove seu plano.';
    }

    if (assinatura.status !== 'active') {
      return `Sua assinatura está com status "${assinatura.status}". Por favor, regularize sua situação.`;
    }

    if (isExpiringoon) {
      const dias = this.getDaysRemaining(assinatura.dataFim);
      return `Sua assinatura expira em ${dias} dias. Considere renovar seu plano.`;
    }

    return 'Sua assinatura está ativa e válida.';
  }
}

