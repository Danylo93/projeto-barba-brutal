import { Injectable, Logger } from '@nestjs/common';

export type StatusConexaoWhatsapp =
  | 'sem_instance'
  | 'nao_configurada'
  | 'nao_encontrada'
  | 'conectada'
  | 'desconectada'
  | 'conectando'
  | 'indisponivel';

export interface ConexaoWhatsapp {
  status: StatusConexaoWhatsapp;
  instance: string | null;
  evolutionState: string | null;
  managerUrl: string | null;
  qrCode?: string | null;
  pairingCode?: string | null;
  mensagem?: string;
}

export interface WebhookWhatsapp {
  status: 'configurado' | 'nao_configurado' | 'indisponivel';
  instance: string | null;
  mensagem: string;
}

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
  private readonly webhookUrl = String(
    process.env.WHATSAPP_WEBHOOK_URL ?? '',
  ).trim();
  private readonly webhookToken =
    String(process.env.WHATSAPP_WEBHOOK_TOKEN ?? '').trim() ||
    String(process.env.WHATSAPP_BOT_TOKEN ?? '').trim();

  private get managerUrl(): string | null {
    const configurada = String(process.env.EVOLUTION_MANAGER_URL ?? '')
      .trim()
      .replace(/\/$/, '');
    if (configurada) return configurada;
    return this.url ? `${this.url}/manager` : null;
  }

  private respostaBase(
    status: StatusConexaoWhatsapp,
    instance: string | null,
    mensagem?: string,
  ): ConexaoWhatsapp {
    return {
      status,
      instance,
      evolutionState: null,
      managerUrl: this.managerUrl,
      ...(mensagem ? { mensagem } : {}),
    };
  }

  private async lerJson(resposta: Response): Promise<any> {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  }

  private async chamarEvolution(caminho: string): Promise<Response> {
    return fetch(`${this.url}${caminho}`, {
      headers: { apikey: this.apikey! },
      signal: AbortSignal.timeout(10_000),
    });
  }

  private registrarRespostaInesperada(operacao: string, resposta: Response) {
    this.logger.warn(
      `Evolution recusou ${operacao} com HTTP ${resposta.status}.`,
    );
  }

  private normalizarQrCode(bruto: unknown): string | null {
    if (typeof bruto !== 'string') return null;
    const valor = bruto.trim();
    if (!valor) return null;

    const dataUrl = valor.match(
      /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i,
    );
    const conteudo = (dataUrl?.[2] ?? valor).replace(/\s/g, '');
    if (!/^[a-z0-9+/]+={0,2}$/i.test(conteudo)) return null;
    return `data:image/${dataUrl?.[1]?.toLowerCase() ?? 'png'};base64,${conteudo}`;
  }

  /** Estado seguro para a tela do tenant; a apikey nunca sai do backend. */
  async obterConexao(instancia?: string | null): Promise<ConexaoWhatsapp> {
    const nome = String(instancia ?? '').trim();
    if (!nome) {
      return this.respostaBase(
        'sem_instance',
        null,
        'Esta barbearia ainda não possui uma instance da Evolution cadastrada.',
      );
    }
    if (!this.url || !this.apikey) {
      return this.respostaBase(
        'nao_configurada',
        nome,
        'A Evolution API ainda não foi configurada no servidor do SaaS.',
      );
    }

    try {
      const resposta = await this.chamarEvolution(
        `/instance/connectionState/${encodeURIComponent(nome)}`,
      );
      if (resposta.status === 404) {
        return this.respostaBase(
          'nao_encontrada',
          nome,
          'A instance salva não foi encontrada na Evolution API.',
        );
      }
      if (!resposta.ok) {
        this.registrarRespostaInesperada('a consulta da conexão', resposta);
        return this.respostaBase(
          'indisponivel',
          nome,
          'Não foi possível consultar a Evolution API agora.',
        );
      }

      const dados = await this.lerJson(resposta);
      const estado = String(
        dados?.instance?.state ?? dados?.state ?? dados?.instance?.status ?? '',
      )
        .trim()
        .toLowerCase();
      const status: StatusConexaoWhatsapp =
        estado === 'open' || estado === 'connected'
          ? 'conectada'
          : estado === 'connecting'
            ? 'conectando'
            : 'desconectada';

      return {
        status,
        instance: nome,
        evolutionState: estado || null,
        managerUrl: this.managerUrl,
      };
    } catch (erro) {
      this.logger.warn(
        `Falha ao consultar conexão da Evolution: ${erro instanceof Error ? erro.message : erro}`,
      );
      return this.respostaBase(
        'indisponivel',
        nome,
        'A Evolution API não respondeu. Tente atualizar em alguns instantes.',
      );
    }
  }

  /** Solicita um QR temporário apenas para a instance do tenant autenticado. */
  async obterQrCode(instancia?: string | null): Promise<ConexaoWhatsapp> {
    const conexao = await this.obterConexao(instancia);
    if (
      conexao.status === 'sem_instance' ||
      conexao.status === 'nao_configurada' ||
      conexao.status === 'nao_encontrada' ||
      conexao.status === 'indisponivel' ||
      conexao.status === 'conectada'
    ) {
      return conexao;
    }

    try {
      const resposta = await this.chamarEvolution(
        `/instance/connect/${encodeURIComponent(conexao.instance!)}`,
      );
      if (resposta.status === 404) {
        return this.respostaBase(
          'nao_encontrada',
          conexao.instance,
          'A instance salva não foi encontrada na Evolution API.',
        );
      }
      if (!resposta.ok) {
        this.registrarRespostaInesperada('a geração do QR Code', resposta);
        return this.respostaBase(
          'indisponivel',
          conexao.instance,
          'A Evolution API não conseguiu gerar o QR Code agora.',
        );
      }

      const dados = await this.lerJson(resposta);
      const bruto =
        dados?.base64 ??
        dados?.qrcode?.base64 ??
        dados?.qrcode ??
        dados?.qr?.base64 ??
        null;
      const imagem = this.normalizarQrCode(bruto);

      // Um QR normal é pequeno; recusar payload enorme evita repassar lixo ao browser.
      if (imagem && imagem.length > 3_000_000) {
        this.logger.warn('Evolution devolveu um QR Code maior que o limite seguro.');
        return this.respostaBase(
          'indisponivel',
          conexao.instance,
          'A Evolution API devolveu um QR Code inválido.',
        );
      }

      return {
        status: imagem ? 'conectando' : conexao.status,
        instance: conexao.instance,
        evolutionState: conexao.evolutionState,
        managerUrl: this.managerUrl,
        qrCode: imagem,
        pairingCode: dados?.pairingCode
          ? String(dados.pairingCode)
          : null,
        ...(!imagem
          ? { mensagem: 'A Evolution ainda não disponibilizou um QR Code. Tente novamente.' }
          : {}),
      };
    } catch (erro) {
      this.logger.warn(
        `Falha ao gerar QR Code da Evolution: ${erro instanceof Error ? erro.message : erro}`,
      );
      return this.respostaBase(
        'indisponivel',
        conexao.instance,
        'A Evolution API não respondeu ao pedido de QR Code.',
      );
    }
  }

  /**
   * Liga a instance ao único webhook do atendente SaaS.
   *
   * É idempotente: a Evolution faz upsert, então abrir a tela novamente também
   * corrige URL, evento ou header que tenham sido alterados manualmente.
   */
  async configurarWebhook(
    instancia?: string | null,
  ): Promise<WebhookWhatsapp> {
    const nome = String(instancia ?? '').trim();
    if (!nome) {
      return {
        status: 'nao_configurado',
        instance: null,
        mensagem: 'Cadastre a instance antes de ativar o webhook.',
      };
    }
    if (!this.url || !this.apikey) {
      return {
        status: 'indisponivel',
        instance: nome,
        mensagem: 'A Evolution API não está configurada no backend.',
      };
    }
    if (!this.webhookUrl || !this.webhookToken) {
      return {
        status: 'nao_configurado',
        instance: nome,
        mensagem:
          'Configure WHATSAPP_WEBHOOK_URL e WHATSAPP_WEBHOOK_TOKEN no backend.',
      };
    }

    try {
      const destino = new URL(this.webhookUrl);
      if (!['http:', 'https:'].includes(destino.protocol)) throw new Error();
    } catch {
      return {
        status: 'nao_configurado',
        instance: nome,
        mensagem: 'WHATSAPP_WEBHOOK_URL não contém uma URL HTTP válida.',
      };
    }

    try {
      const resposta = await fetch(
        `${this.url}/webhook/set/${encodeURIComponent(nome)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apikey,
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: this.webhookUrl,
              headers: { 'x-whatsapp-token': this.webhookToken },
              byEvents: false,
              base64: false,
              events: ['MESSAGES_UPSERT'],
            },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!resposta.ok) {
        this.registrarRespostaInesperada(
          'a configuração do webhook',
          resposta,
        );
        return {
          status: 'indisponivel',
          instance: nome,
          mensagem: `A Evolution recusou o webhook (HTTP ${resposta.status}).`,
        };
      }

      return {
        status: 'configurado',
        instance: nome,
        mensagem: 'Webhook de mensagens configurado na Evolution.',
      };
    } catch (erro) {
      this.logger.warn(
        `Falha ao configurar webhook da Evolution: ${erro instanceof Error ? erro.message : erro}`,
      );
      return {
        status: 'indisponivel',
        instance: nome,
        mensagem: 'A Evolution não respondeu à configuração do webhook.',
      };
    }
  }

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
