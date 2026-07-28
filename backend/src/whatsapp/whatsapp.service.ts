import { Injectable, Logger } from '@nestjs/common';

/**
 * Envio de WhatsApp pela Evolution API, direto do backend.
 *
 * Não passa pelo n8n de propósito: mensagem de confirmação de plano é parte
 * do fluxo de contratação e não pode depender de um workflow externo estar
 * ligado — hoje, se o n8n estiver parado, ninguém fica sabendo.
 *
 * Sem as variáveis configuradas o serviço não quebra nada: registra em log e
 * segue, igual ao envio de e-mail. Nunca derruba a operação que o chamou.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly url = process.env.EVOLUTION_URL?.replace(/\/$/, '');
  private readonly apikey = process.env.EVOLUTION_APIKEY;
  private readonly instancia = process.env.EVOLUTION_INSTANCE;

  get configurado(): boolean {
    return !!(this.url && this.apikey && this.instancia);
  }

  /**
   * Normaliza para o formato que a Evolution espera: só dígitos, com o 55 na
   * frente. Número brasileiro sem DDI não é entregue.
   */
  private numeroInternacional(telefone: string): string | null {
    const so = (telefone || '').replace(/\D/g, '');
    if (so.length < 10) return null;
    if (so.startsWith('55')) return so.length >= 12 ? so : null;
    return `55${so}`;
  }

  async enviarTexto(telefone: string, texto: string): Promise<boolean> {
    const numero = this.numeroInternacional(telefone);
    if (!numero) {
      this.logger.warn(`Telefone inválido para WhatsApp: ${telefone}`);
      return false;
    }
    if (!this.configurado) {
      this.logger.log(
        `[WhatsApp desativado] para ${numero}: ${texto.slice(0, 80)}…`,
      );
      return false;
    }

    try {
      const resposta = await fetch(
        `${this.url}/message/sendText/${this.instancia}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apikey!,
          },
          body: JSON.stringify({ number: numero, text: texto }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => '');
        this.logger.error(
          `Evolution respondeu ${resposta.status}: ${corpo.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (erro) {
      // Falha de WhatsApp não pode derrubar contratação de plano.
      this.logger.error(
        `Falha ao enviar WhatsApp para ${numero}: ${erro instanceof Error ? erro.message : erro}`,
      );
      return false;
    }
  }
}
