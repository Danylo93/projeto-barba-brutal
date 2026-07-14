import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../db/prisma.service';

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
    const { id, tenantId, tipo } = payload;

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

      if (!tenant || !tenant.ativo) {
        throw new UnauthorizedException('Tenant não encontrado ou inativo');
      }

      const { senha, ...tenantSemSenha } = tenant;
      return { ...tenantSemSenha, tipo: 'tenant' };
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

      const { senha, ...adminSemSenha } = admin;
      return { ...adminSemSenha, tipo: 'admin' };
    }

    throw new UnauthorizedException('Tipo de usuário inválido');
  }
}
