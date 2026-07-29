import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { emailRecuperacaoSenha } from '../notificacao/templates';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

/** O link vale 1 hora: tempo de ler o e-mail, não de vazar num histórico. */
const VALIDADE_MINUTOS = 60;

@Injectable()
export class RecuperacaoService {
  private readonly logger = new Logger(RecuperacaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacao: NotificacaoService,
  ) {}

  /** No banco fica só o hash: quem ler a tabela não consegue usar o link. */
  private hashDoToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private get urlDoSite(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
  }

  /**
   * Começa a recuperação.
   *
   * Responde a mesma coisa existindo ou não a conta. Dizer "e-mail não
   * encontrado" entrega para qualquer um qual e-mail tem cadastro aqui —
   * e, num SaaS de barbearia, isso é lista de clientes de graça.
   */
  async solicitar(email: string, tenantId?: number) {
    const resposta = {
      ok: true,
      mensagem:
        'Se houver uma conta com esse e-mail, enviamos o link de recuperação.',
    };

    const limpo = (email || '').trim().toLowerCase();
    if (!limpo) return resposta;

    const tenant = await this.prisma.tenant.findFirst({
      where: { email: limpo, ativo: true },
      select: { id: true, nome: true, email: true },
    });

    const usuario = tenant
      ? null
      : await this.prisma.usuario.findFirst({
          where: {
            email: limpo,
            ativo: true,
            ...(tenantId ? { tenantId } : {}),
          },
          select: { id: true, nome: true, email: true, tenantId: true },
        });

    if (!tenant && !usuario) {
      // Some sem contar por quê, mas registra para dar pra investigar suporte.
      this.logger.log(`Recuperação pedida para e-mail sem conta: ${limpo}`);
      return resposta;
    }

    const token = randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60_000);

    // Um pedido em aberto por conta: pedir de novo invalida o anterior.
    await this.prisma.recuperacaoSenha.deleteMany({
      where: {
        titularTipo: tenant ? 'tenant' : 'usuario',
        titularId: tenant ? tenant.id : usuario!.id,
        usadoEm: null,
      },
    });

    await this.prisma.recuperacaoSenha.create({
      data: {
        titularTipo: tenant ? 'tenant' : 'usuario',
        titularId: tenant ? tenant.id : usuario!.id,
        tokenHash: this.hashDoToken(token),
        expiraEm,
      },
    });

    const destino = tenant ?? usuario!;
    const link =
      `${this.urlDoSite}/redefinir-senha?token=${token}` +
      (usuario ? `&tenant=${usuario.tenantId}` : '');

    await this.notificacao.enviarTemplate(
      destino.email,
      emailRecuperacaoSenha({
        nome: destino.nome,
        link,
        validadeMinutos: VALIDADE_MINUTOS,
      }),
    );

    // Sem SMTP o e-mail só vai para o log, e o barbeiro fica esperando para
    // sempre. Deixar registrado é o mínimo para o suporte achar depois.
    if (!this.notificacao.emailAtivo) {
      this.logger.warn(
        `SMTP não configurado: link de recuperação de ${destino.email} não foi enviado.`,
      );
    }

    return resposta;
  }

  /** Troca a senha e queima o token. */
  async redefinir(token: string, novaSenha: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Link inválido.');
    }
    if (!novaSenha || novaSenha.length < 6) {
      throw new BadRequestException('A nova senha precisa ter ao menos 6 caracteres.');
    }

    const pedido = await this.prisma.recuperacaoSenha.findFirst({
      where: {
        tokenHash: this.hashDoToken(token.trim()),
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
    });
    if (!pedido) {
      throw new BadRequestException(
        'Link inválido ou expirado. Peça a recuperação de novo.',
      );
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await this.prisma.$transaction([
      pedido.titularTipo === 'tenant'
        ? this.prisma.tenant.update({
            where: { id: pedido.titularId },
            data: { senha: senhaHash },
          })
        : this.prisma.usuario.update({
            where: { id: pedido.titularId },
            data: { senha: senhaHash },
          }),
      // Queima o token: um link, um uso.
      this.prisma.recuperacaoSenha.update({
        where: { id: pedido.id },
        data: { usadoEm: new Date() },
      }),
    ]);

    return { ok: true, mensagem: 'Senha alterada. Você já pode entrar.' };
  }
}
