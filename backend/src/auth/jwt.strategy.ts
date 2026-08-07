import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../db/prisma.service';
import { MOTIVO_SESSAO_ENCERRADA, sessaoValida } from './sessao';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const { id, tenantId, tipo, sid } = payload;

    if (tipo === 'tenant') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          assinatura: {
            include: {
              plano: true,
            },
          },
        },
      });

      // Suspensão vale para o token também, não só para o login: sem isto, o
      // dono que já estivesse logado quando o admin suspendeu continuaria
      // trabalhando até o token vencer — e suspender deixaria de ter efeito
      // imediato, que é justamente o que se espera de uma alavanca do admin.
      //
      // Assinatura vencida é outra coisa e NÃO cai aqui: quem decide o que a
      // conta sem plano pode fazer é o SubscriptionGuard, que rebaixa para o
      // plano de entrada em vez de barrar.
      if (!tenant || !tenant.ativo) {
        throw new UnauthorizedException('Tenant não encontrado ou inativo');
      }
      // Uma sessão por conta: o login mais recente vence, o anterior cai aqui.
      if (!sessaoValida(sid, tenant.sessaoId)) {
        throw new UnauthorizedException(MOTIVO_SESSAO_ENCERRADA);
      }

      const { senha, ...tenantSemSenha } = tenant;
      // `tenantId` explícito: a linha de `tenant` só tem `id`, e sem este
      // campo o SubscriptionGuard barrava o dono com "Tenant não
      // identificado" em toda rota protegida — a agenda inteira, inclusive.
      return { ...tenantSemSenha, tenantId: tenant.id, tipo: 'tenant' };
    }

    if (tipo === 'usuario') {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id },
        include: {
          tenant: {
            include: {
              assinatura: {
                include: {
                  plano: true,
                },
              },
            },
          },
        },
      });

      if (!usuario || !usuario.ativo) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }
      if (!sessaoValida(sid, usuario.sessaoId)) {
        throw new UnauthorizedException(MOTIVO_SESSAO_ENCERRADA);
      }

      const { senha, tenant, ...usuarioSemSenha } = usuario;
      const tenantSemSenha = tenant ? (({ senha: _s, ...t }) => t)(tenant) : tenant;
      return { ...usuarioSemSenha, tenant: tenantSemSenha, tipo: 'usuario' };
    }

    if (tipo === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!admin || !admin.ativo) {
        throw new UnauthorizedException('Admin não encontrado ou inativo');
      }
      if (!sessaoValida(sid, admin.sessaoId)) {
        throw new UnauthorizedException(MOTIVO_SESSAO_ENCERRADA);
      }

      const { senha, ...adminSemSenha } = admin;
      return { ...adminSemSenha, tipo: 'admin' };
    }

    throw new UnauthorizedException('Tipo de usuário inválido');
  }
}
