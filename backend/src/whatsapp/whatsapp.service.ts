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

  /**
   * Dá para enviar? A instância pode vir da barbearia; a do ambiente é o
   * padrão de quem não tem número próprio.
   */
  configuradoPara(instancia?: string | null): boolean {
    return !!(this.url && this.apikey && (this.instanciaDe(instancia)));
  }

  get configurado(): boolean {
    return this.configuradoPara(undefined);
  }

  /**
   * De qual número sai a mensagem.
   *
   * O sistema passou a ter uma instância da Evolution por barbearia
   * (`tenant.configuracoes.evolutionInstance`), mas o envio continuava
   * amarrado ao `EVOLUTION_INSTANCE` do ambiente. Na prática, o lembrete de
   * TODA barbearia sairia de um número só — o cliente da Latita receberia a
   * mensagem pelo WhatsApp de outra barbearia.
   */
  private instanciaDe(instancia?: string | null): string | undefined {
    const propria = String(instancia ?? '').trim();
    return propria || this.instancia;
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

  /**
   * `instancia` é o número da barbearia. Sem ela, cai no do ambiente — que é
   * o certo para a instalação de uma barbearia só.
   */
  async enviarTexto(
    telefone: string,
    texto: string,
    instancia?: string | null,
  ): Promise<boolean> {
    const numero = this.numeroInternacional(telefone);
    if (!numero) {
      this.logger.warn(`Telefone inválido para WhatsApp: ${telefone}`);
      return false;
    }
    const deQuem = this.instanciaDe(instancia);
    if (!this.configuradoPara(instancia)) {
      this.logger.log(
        `[WhatsApp desativado] para ${numero}: ${texto.slice(0, 80)}…`,
      );
      return false;
    }

    try {
      const resposta = await fetch(
        `${this.url}/message/sendText/${deQuem}`,
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
