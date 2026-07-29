import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Email, emailAgendamentoConfirmado } from './templates';
import {
  URL_RESEND,
  chaveDoResend,
  corpoDoEnvio,
  interpretarResposta,
  remetente,
} from './resend';
import { PrismaService } from '../db/prisma.service';

/** Por onde o e-mail sai deste servidor. */
export type CanalDeEmail = 'resend' | 'smtp' | 'nenhum';

/**
 * Envio de notificações (e-mail). É opcional e não bloqueante: sem canal
 * configurado, apenas registra em log e segue. WhatsApp fica como link pronto
 * (wa.me) para envio manual/integração futura.
 *
 * Há dois canais, nesta ordem:
 *
 * 1. **Resend** (`RESEND_API_KEY`), por HTTPS na 443. É o que funciona onde
 *    estamos hospedados: o Render bloqueia a saída nas portas de SMTP nos
 *    serviços do plano free, e o smtp.gmail.com dava "Connection timeout".
 * 2. **SMTP** (`SMTP_HOST`), que continua de pé para rodar local e para o dia
 *    em que o serviço for pago.
 */
@Injectable()
export class NotificacaoService {
  private readonly logger = new Logger(NotificacaoService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly resendKey: string | undefined;

  constructor(private readonly prisma: PrismaService) {
    this.resendKey = chaveDoResend();

    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
        // Sem estes limites o nodemailer espera o SO desistir do socket — em
        // produção isso deu 2 minutos de requisição pendurada quando o SMTP
        // estava inalcançável. 10s é tempo de sobra para um servidor que
        // funciona e curto o bastante para não segurar ninguém.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
    } else {
      this.transporter = null;
    }

    this.logger.log(`Canal de e-mail: ${this.canal}`);
  }

  /** Qual canal está valendo agora. */
  get canal(): CanalDeEmail {
    if (this.resendKey) return 'resend';
    if (this.transporter) return 'smtp';
    return 'nenhum';
  }

  /** Notifica cliente e barbeiro sobre um novo agendamento. Nunca lança. */
  async notificarNovoAgendamento(agendamentoId: number): Promise<void> {
    try {
      const ag = await this.prisma.agendamento.findUnique({
        where: { id: agendamentoId },
        include: {
          servicos: true,
          usuario: true,
          profissional: { include: { usuario: true } },
          tenant: true,
        },
      });
      if (!ag) return;

      const barbearia = ag.tenant?.nome || 'Barbearia';
      const quando = new Date(ag.data).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'long',
        timeStyle: 'short',
      });
      const servicos = ag.servicos.map((s) => s.nome).join(', ');
      const profissional = ag.profissional?.nome ?? '';

      if (ag.usuario?.email) {
        await this.enviarTemplate(
          ag.usuario.email,
          emailAgendamentoConfirmado({
            nomeCliente: ag.usuario.nome || 'cliente',
            nomeBarbearia: barbearia,
            servicos,
            profissional,
            quando: new Date(ag.data),
            endereco: ag.tenant?.endereco,
          }),
        );
      }

      const emailBarbeiro = ag.profissional?.usuario?.email;
      if (emailBarbeiro) {
        await this.enviarEmail(
          emailBarbeiro,
          `Novo agendamento — ${barbearia}`,
          `Novo agendamento de ${ag.usuario?.nome || 'cliente'}.\n` +
            `Data: ${quando}\nServiços: ${servicos}`,
        );
      }

      await this.dispararWebhook(ag, 'agendamento_criado');
    } catch (e: any) {
      this.logger.warn(`Falha ao notificar agendamento ${agendamentoId}: ${e?.message}`);
    }
  }

  /** Dispara webhook e notifica cancelamento */
  async notificarCancelamentoAgendamento(agendamento: any): Promise<void> {
    try {
      const ag = await this.prisma.agendamento.findUnique({
        where: { id: agendamento.id },
        include: { tenant: true, usuario: true, profissional: true, servicos: true },
      });
      if (!ag) return;
      
      await this.dispararWebhook(ag, 'agendamento_cancelado');
    } catch(e: any) {
      this.logger.warn(`Falha ao notificar cancelamento do agendamento ${agendamento.id}: ${e?.message}`);
    }
  }

  /** Função interna para disparar Webhook/n8n/Evolution */
  private async dispararWebhook(agendamentoData: any, evento: string) {
      const configObj = (agendamentoData.tenant?.configuracoes as any) || {};
      const webhookUrl = configObj.webhookUrl;
      const evolutionToken = configObj.evolutionToken;

      if (!webhookUrl) return;

      try {
          await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(evolutionToken ? { 'apikey': evolutionToken } : {})
              },
              body: JSON.stringify({
                  evento,
                  agendamento: {
                      id: agendamentoData.id,
                      data: agendamentoData.data,
                      status: agendamentoData.status,
                      cliente: agendamentoData.usuario?.nome,
                      telefone: agendamentoData.usuario?.telefone,
                      email: agendamentoData.usuario?.email,
                      profissional: agendamentoData.profissional?.nome,
                      servicos: agendamentoData.servicos?.map((s: any) => s.nome),
                  },
                  tenantId: agendamentoData.tenantId,
              })
          });
      } catch(e: any) {
          this.logger.warn(`Falha ao disparar webhook para tenant ${agendamentoData.tenantId}: ${e.message}`);
      }
  }

  /** Público porque a recuperação de senha também precisa mandar e-mail. */
  async enviarEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    if (this.resendKey) {
      await this.enviarPeloResend(to, subject, text, html);
      return;
    }
    if (this.transporter) {
      // Manda os dois: o texto puro é o que aparece na prévia da caixa de
      // entrada e o que o filtro de spam lê quando o cliente bloqueia HTML.
      await this.transporter.sendMail({ from: remetente(), to, subject, text, html });
      return;
    }
    this.logger.log(`[e-mail desativado] Para ${to}: ${subject}`);
  }

  /** POST único na API do Resend — sem SDK, para não crescer a dependência. */
  private async enviarPeloResend(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const resposta = await fetch(URL_RESEND, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        corpoDoEnvio({ de: remetente(), para: to, assunto: subject, texto: text, html }),
      ),
      // Mesma razão dos timeouts do SMTP: nada pode ficar pendurado esperando
      // uma rede que não responde.
      signal: AbortSignal.timeout(15_000),
    });

    const corpo = await resposta.json().catch(() => ({}));
    const resultado = interpretarResposta(resposta.status, corpo);
    if (!resultado.ok) throw new Error(resultado.erro);
  }

  /** Atalho para os templates de `templates.ts`. */
  async enviarTemplate(to: string, email: Email): Promise<void> {
    await this.enviarEmail(to, email.assunto, email.texto, email.html);
  }

  /**
   * Dispara o e-mail sem segurar a resposta HTTP, e sem deixar a falha subir.
   *
   * Existe porque esperar o SMTP dentro da requisição criou um problema pior
   * que o e-mail não chegar: com o servidor fora do ar, o pedido de
   * recuperação ficava 2 minutos pendurado e terminava em 500 — enquanto um
   * e-mail sem conta respondia 201 na hora. A diferença de resposta entregava
   * quais e-mails têm cadastro, que é exatamente o que a tela evita dizer.
   */
  enviarTemplateEmSegundoPlano(to: string, email: Email): void {
    this.enviarTemplate(to, email).catch((erro) =>
      this.logger.error(
        `Falha ao enviar "${email.assunto}" para ${to}: ${
          erro instanceof Error ? erro.message : erro
        }`,
      ),
    );
  }

  /** true quando há canal configurado — sem isso, o e-mail só vai para o log. */
  get emailAtivo(): boolean {
    return this.canal !== 'nenhum';
  }

  /**
   * Confere se o canal ativo responde, e devolve o motivo quando não responde.
   *
   * Serve ao `/health/email`: sem isso, a única forma de descobrir que o e-mail
   * não sai é um barbeiro reclamar que o link de recuperação não chegou.
   */
  async testarConexao(): Promise<{ ok: boolean; erro?: string }> {
    if (this.resendKey) {
      try {
        // Endpoint de domínios: confirma que a chave é válida sem gastar envio.
        const r = await fetch('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${this.resendKey}` },
          signal: AbortSignal.timeout(15_000),
        });
        if (r.ok) return { ok: true };
        const corpo = await r.json().catch(() => ({}));
        return { ok: false, erro: interpretarResposta(r.status, corpo).erro };
      } catch (erro: any) {
        return { ok: false, erro: erro?.message || String(erro) };
      }
    }

    if (this.transporter) {
      try {
        await this.transporter.verify();
        return { ok: true };
      } catch (erro: any) {
        return { ok: false, erro: erro?.message || String(erro) };
      }
    }

    return { ok: false, erro: 'Nenhum canal configurado (RESEND_API_KEY ou SMTP_HOST)' };
  }

  /** Link wa.me pronto para enviar uma mensagem (integração WhatsApp futura). */
  linkWhatsApp(telefone: string | undefined, mensagem: string): string | null {
    const num = (telefone || '').replace(/\D/g, '');
    if (!num) return null;
    const comDDI = num.startsWith('55') ? num : `55${num}`;
    return `https://wa.me/${comDDI}?text=${encodeURIComponent(mensagem)}`;
  }
}
