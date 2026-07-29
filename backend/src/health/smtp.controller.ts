import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { remetente } from '../notificacao/resend';

/**
 * Diz se o e-mail sai deste servidor.
 *
 * Existe porque, quando o envio não funciona, nada na tela muda: a recuperação
 * de senha responde "se houver uma conta, enviamos o link" do mesmo jeito, e o
 * barbeiro fica esperando um e-mail que nunca vai chegar. A falha só aparece
 * no log — e ninguém lê log antes de o cliente reclamar.
 *
 * Só admin do SaaS. E nunca devolve chave de API nem senha: o que interessa
 * aqui é se o canal responde, não qual é a credencial.
 */
@Controller('health')
export class SmtpController {
  constructor(private readonly notificacao: NotificacaoService) {}

  @Get('email')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async conferirEmail() {
    const canal = this.notificacao.canal;

    if (canal === 'nenhum') {
      return {
        canal,
        conecta: false,
        problema:
          'Nenhum canal configurado. Defina RESEND_API_KEY (recomendado) ou ' +
          'SMTP_HOST. Sem isso os e-mails só vão para o log e ninguém recebe.',
      };
    }

    const resultado = await this.notificacao.testarConexao();

    const detalhes =
      canal === 'resend'
        ? { via: 'API HTTP (443)' }
        : {
            via: 'SMTP',
            host: process.env.SMTP_HOST,
            porta: Number(process.env.SMTP_PORT || 587),
            seguro: process.env.SMTP_SECURE === 'true',
            autenticado: !!process.env.SMTP_USER,
          };

    return {
      canal,
      ...detalhes,
      remetente: remetente(),
      conecta: resultado.ok,
      ...(resultado.ok ? {} : { problema: resultado.erro }),
    };
  }

  /** Nome antigo da rota; mantido para não quebrar quem já anotou o endereço. */
  @Get('smtp')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  conferirSmtp() {
    return this.conferirEmail();
  }
}
