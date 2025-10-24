import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    nome: string;
    email: string;
    telefone: string;
    endereco?: string;
    cnpj?: string;
    dominio?: string;
    logo?: string;
    corPrimaria?: string;
    corSecundaria?: string;
  }) {
    return this.prisma.tenant.create({
      data,
    });
  }

  async findById(id: number) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
        _count: {
          select: {
            usuarios: true,
            profissionais: true,
            servicos: true,
            agendamentos: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.tenant.findUnique({
      where: { email },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });
  }

  async findByDominio(dominio: string) {
    return this.prisma.tenant.findUnique({
      where: { dominio },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });
  }

  async update(id: number, data: Partial<{
    nome: string;
    email: string;
    telefone: string;
    endereco: string;
    cnpj: string;
    dominio: string;
    logo: string;
    corPrimaria: string;
    corSecundaria: string;
    ativo: boolean;
  }>) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        include: {
          assinatura: {
            include: {
              plano: true,
            },
          },
          _count: {
            select: {
              usuarios: true,
              profissionais: true,
              servicos: true,
              agendamentos: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: number) {
    return this.prisma.tenant.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async checkLimits(tenantId: number) {
    const tenant = await this.findById(tenantId);
    
    if (!tenant?.assinatura) {
      throw new Error('Tenant sem assinatura ativa');
    }

    const plano = tenant.assinatura.plano;
    const counts = tenant._count;

    return {
      usuarioLimit: counts.usuarios >= plano.maxUsuarios,
      agendamentoLimit: counts.agendamentos >= plano.maxAgendamentos,
      limits: {
        maxUsuarios: plano.maxUsuarios,
        maxAgendamentos: plano.maxAgendamentos,
        currentUsuarios: counts.usuarios,
        currentAgendamentos: counts.agendamentos,
      },
    };
  }
}
