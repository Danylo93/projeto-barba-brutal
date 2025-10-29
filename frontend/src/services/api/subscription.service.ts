/**
 * Serviço para gerenciar erros e validações de assinatura
 * Trata mensagens de erro relacionadas a planos e assinaturas
 */

export interface SubscriptionError {
  code: string;
  message: string;
  type: 'NO_SUBSCRIPTION' | 'INACTIVE_SUBSCRIPTION' | 'EXPIRED_SUBSCRIPTION' | 'INVALID_PLAN';
  userFriendlyMessage: string;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isActive: boolean;
  status: string;
  plano: string;
  diasRestantes: number;
  message: string;
}

class SubscriptionService {
  /**
   * Verifica se um erro é relacionado a assinatura
   */
  isSubscriptionError(error: any): boolean {
    if (!error) return false;

    const message = error.message || error.error?.message || '';
    const code = error.code || error.error?.code || '';

    return (
      message.includes('plano') ||
      message.includes('assinatura') ||
      message.includes('barbearia') ||
      code.includes('SUBSCRIPTION') ||
      code.includes('PLAN')
    );
  }

  /**
   * Extrai informações de erro de assinatura
   */
  parseSubscriptionError(error: any): SubscriptionError {
    const message = error.message || error.error?.message || 'Erro desconhecido';
    const code = error.code || error.error?.code || 'UNKNOWN_ERROR';

    // Detectar tipo de erro
    let type: SubscriptionError['type'] = 'INVALID_PLAN';

    if (message.includes('não possui um plano')) {
      type = 'NO_SUBSCRIPTION';
    } else if (message.includes('expirou')) {
      type = 'EXPIRED_SUBSCRIPTION';
    } else if (message.includes('status')) {
      type = 'INACTIVE_SUBSCRIPTION';
    }

    return {
      code,
      message,
      type,
      userFriendlyMessage: this.getUserFriendlyMessage(type, message),
    };
  }

  /**
   * Gera mensagem amigável para o usuário
   */
  private getUserFriendlyMessage(type: SubscriptionError['type'], message: string): string {
    const messages: Record<SubscriptionError['type'], string> = {
      NO_SUBSCRIPTION: '❌ Sua barbearia não possui um plano ativo. Por favor, adquira um plano para continuar.',
      EXPIRED_SUBSCRIPTION: '⏰ Sua assinatura expirou. Por favor, renove seu plano para continuar.',
      INACTIVE_SUBSCRIPTION: '⚠️ Sua assinatura está inativa. Por favor, regularize sua situação para continuar.',
      INVALID_PLAN: '❌ Não foi possível validar seu plano. Por favor, contate o suporte.',
    };

    return messages[type] || message;
  }

  /**
   * Formata mensagem de status de assinatura
   */
  formatSubscriptionStatus(status: SubscriptionStatus): string {
    if (!status.hasSubscription) {
      return 'Nenhuma assinatura ativa';
    }

    if (!status.isActive) {
      return `Assinatura inativa (${status.status})`;
    }

    if (status.diasRestantes <= 0) {
      return 'Assinatura expirada';
    }

    if (status.diasRestantes <= 7) {
      return `⚠️ Expira em ${status.diasRestantes} dias`;
    }

    return `✅ Ativo - ${status.plano}`;
  }

  /**
   * Verifica se deve mostrar aviso de renovação
   */
  shouldShowRenewalWarning(status: SubscriptionStatus): boolean {
    return status.isActive && status.diasRestantes > 0 && status.diasRestantes <= 7;
  }

  /**
   * Gera URL para renovação de plano
   */
  getRenewalUrl(tenantId?: number): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const params = tenantId ? `?tenantId=${tenantId}` : '';
    return `${baseUrl}/planos${params}`;
  }

  /**
   * Gera URL para adquirir plano
   */
  getPlansUrl(tenantId?: number): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const params = tenantId ? `?tenantId=${tenantId}` : '';
    return `${baseUrl}/planos${params}`;
  }
}

export default new SubscriptionService();

