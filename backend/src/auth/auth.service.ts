import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';
import { SubscriptionValidationService } from '../common/services/subscription-validation.service';
import { escolherCorMarca, COR_PRIMARIA_PADRAO } from '../tenant/cores-marca';
import * as bcrypt from 'bcrypt';

/** Valida formato de e-mail. */
function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida telefone brasileiro (WhatsApp).
 * Aceita somente dígitos, com DDD (2 dígitos) + número (8 ou 9 dígitos) = 10 ou 11 dígitos.
 */
function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '');
  return numeros.length === 10 || numeros.length === 11;
}

/** Remove o campo `senha` de um objeto (shallow), evitando vazar o hash em respostas. */
function semSenha<T extends { senha?: any } | null | undefined>(obj: T): T {
  if (!obj) return obj;
  const { senha, ...rest } = obj as any;
  return rest;
}

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
      tenant: semSenha(tenant),
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

    // A barbearia (tenant) precisa estar ativa para o cliente/barbeiro acessar.
    if (!usuario.tenant?.ativo) {
      throw new UnauthorizedException(
        'Esta barbearia está indisponível no momento. Fale com a barbearia.',
      );
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
      usuario: { ...semSenha(usuario), tenant: semSenha(usuario.tenant) },
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
      admin: semSenha(admin),
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
    if (!validarEmail(data.email)) {
      throw new BadRequestException('E-mail inválido. Informe um e-mail válido (ex: nome@email.com)');
    }
    if (!validarTelefone(data.telefone)) {
      throw new BadRequestException('Telefone inválido. Informe o DDD + número (ex: 11999990000)');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    // Cada barbearia nova recebe uma cor de marca diferente das já existentes.
    const existentes = await this.prisma.tenant.findMany({
      select: { corSecundaria: true },
    });
    const corSecundaria = escolherCorMarca(
      existentes.map((t) => t.corSecundaria),
      existentes.length,
    );

    const tenant = await this.prisma.tenant.create({
      data: {
        ...data,
        senha: senhaHash,
        corPrimaria: COR_PRIMARIA_PADRAO,
        corSecundaria,
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
      tenant: semSenha(tenant),
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
    if (!validarEmail(data.email)) {
      throw new BadRequestException('E-mail inválido. Informe um e-mail válido (ex: nome@email.com)');
    }
    if (!validarTelefone(data.telefone)) {
      throw new BadRequestException('Telefone inválido. Informe o DDD + número (ex: 11999990000)');
    }

    // Não permite cadastro de cliente em barbearia inexistente/inativa.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { ativo: true },
    });
    if (!tenant || !tenant.ativo) {
      throw new UnauthorizedException(
        'Esta barbearia está indisponível no momento. Fale com a barbearia.',
      );
    }


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
      usuario: { ...semSenha(usuario), tenant: semSenha(usuario.tenant) },
    };
  }
}
