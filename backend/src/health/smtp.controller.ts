import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { NotificacaoService } from '../notificacao/notificacao.service';

/**
 * Diz se o e-mail sai deste servidor.
 *
 * Existe porque, quando o SMTP não funciona, nada na tela muda: a recuperação
 * de senha responde "se houver uma conta, enviamos o link" do mesmo jeito, e o
 * barbeiro fica esperando um e-mail que nunca vai chegar. A falha só aparece
 * no log — e ninguém lê log antes de o cliente reclamar.
 *
 * Só admin do SaaS. E nunca devolve usuário nem senha do SMTP: o que interessa
 * aqui é se a conexão fecha, não qual é a credencial.
 */
@Controller('health')
export class SmtpController {
  constructor(private readonly notificacao: NotificacaoService) {}

  @Get('smtp')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async conferirSmtp() {
    const configurado = this.notificacao.emailAtivo;

    if (!configurado) {
      return {
        configurado: false,
        conecta: false,
        problema:
          'SMTP_HOST não está definido. Sem ele o servidor nem tenta enviar: ' +
          'os e-mails só vão para o log e ninguém recebe nada.',
      };
    }

    const resultado = await this.notificacao.testarConexao();

    return {
      configurado: true,
      host: process.env.SMTP_HOST,
      porta: Number(process.env.SMTP_PORT || 587),
      seguro: process.env.SMTP_SECURE === 'true',
      autenticado: !!process.env.SMTP_USER,
      remetente: process.env.SMTP_FROM || 'no-reply@barbabrutal.app',
      conecta: resultado.ok,
      ...(resultado.ok ? {} : { problema: resultado.erro }),
    };
  }
}
