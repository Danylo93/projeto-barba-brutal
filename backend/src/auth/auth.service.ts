import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';
import { SubscriptionValidationService } from '../common/services/subscription-validation.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private subscriptionValidation: SubscriptionValidationService,
  ) {}

  async loginTenant(email: string, senha: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });

    if (!tenant || !tenant.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se a senha está correta (assumindo que a senha está hasheada)
    const senhaValida = await bcrypt.compare(senha, tenant.senha || '');
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // ✅ VALIDAR ASSINATURA ATIVA PARA TENANT/OWNER
    // O owner precisa ter um plano ativo para acessar o sistema
    await this.subscriptionValidation.validateTenantSubscription(tenant.id);

    const payload = {
      id: tenant.id,
      tenantId: tenant.id,
      tipo: 'tenant',
      email: tenant.email,
    };

    // Obter informações da assinatura para retornar
    const subscriptionStatus = await this.subscriptionValidation.getSubscriptionStatus(tenant.id);

    return {
      access_token: this.jwtService.sign(payload),
      tenant,
      subscription: subscriptionStatus,
    };
  }

  async loginUsuario(email: string, senha: string, tenantId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        email_tenantId: {
          email,
          tenantId,
        },
      },
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
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // ✅ VALIDAR ASSINATURA ATIVA DO TENANT
    // O barbeiro só pode logar se o owner/tenant tiver um plano ativo
    await this.subscriptionValidation.validateTenantSubscription(tenantId);

    const payload = {
      id: usuario.id,
      tenantId: usuario.tenantId,
      tipo: 'usuario',
      email: usuario.email,
      barbeiro: usuario.barbeiro,
    };

    // Obter informações da assinatura para retornar
    const subscriptionStatus = await this.subscriptionValidation.getSubscriptionStatus(tenantId);

    return {
      access_token: this.jwtService.sign(payload),
      usuario,
      subscription: subscriptionStatus,
    };
  }

  async loginAdmin(email: string, senha: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      id: admin.id,
      tipo: 'admin',
      email: admin.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin,
    };
  }

  async registerTenant(data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    endereco?: string;
    cnpj?: string;
  }) {
    const senhaHash = await bcrypt.hash(data.senha, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        ...data,
        senha: senhaHash,
      },
    });

    const payload = {
      id: tenant.id,
      tenantId: tenant.id,
      tipo: 'tenant',
      email: tenant.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      tenant,
    };
  }

  async registerUsuario(data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    barbeiro: boolean;
    tenantId: number;
  }) {
    const senhaHash = await bcrypt.hash(data.senha, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        ...data,
        senha: senhaHash,
      },
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

    const payload = {
      id: usuario.id,
      tenantId: usuario.tenantId,
      tipo: 'usuario',
      email: usuario.email,
      barbeiro: usuario.barbeiro,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario,
    };
  }
}
