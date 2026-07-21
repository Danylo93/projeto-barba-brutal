import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from 'src/db/prisma.service';

/**
 * Envio de notificações de agendamento (e-mail). É opcional e não bloqueante:
 * sem SMTP configurado (variáveis SMTP_*), apenas registra em log e segue.
 * WhatsApp fica como link pronto (wa.me) para envio manual/integração futura.
 */
@Injectable()
export class NotificacaoService {
  private readonly logger = new Logger(NotificacaoService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly prisma: PrismaService) {
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    } else {
      this.transporter = null;
    }
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
        await this.enviarEmail(
          ag.usuario.email,
          `Agendamento confirmado — ${barbearia}`,
          `Olá ${ag.usuario.nome || ''},\n\n` +
            `Seu horário na ${barbearia} está confirmado.\n` +
            `Data: ${quando}\nProfissional: ${profissional}\nServiços: ${servicos}\n\n` +
            `Até logo!`,
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
    } catch (e: any) {
      this.logger.warn(`Falha ao notificar agendamento ${agendamentoId}: ${e?.message}`);
    }
  }

  private async enviarEmail(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[e-mail desativado] Para ${to}: ${subject}`);
      return;
    }
    const from = process.env.SMTP_FROM || 'no-reply@barbabrutal.app';
    await this.transporter.sendMail({ from, to, subject, text });
  }

  /** Link wa.me pronto para enviar uma mensagem (integração WhatsApp futura). */
  linkWhatsApp(telefone: string | undefined, mensagem: string): string | null {
    const num = (telefone || '').replace(/\D/g, '');
    if (!num) return null;
    const comDDI = num.startsWith('55') ? num : `55${num}`;
    return `https://wa.me/${comDDI}?text=${encodeURIComponent(mensagem)}`;
  }
}
