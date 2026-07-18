import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalTenants,
      activeTenants,
      totalRevenue,
      totalAgendamentos,
      planosStats,
      recentTenants,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { ativo: true } }),
      this.getTotalRevenue(),
      this.prisma.agendamento.count(),
      this.getPlanosStats(),
      this.getRecentTenants(),
    ]);

    return {
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      totalRevenue,
      totalAgendamentos,
      planosStats,
      recentTenants,
    };
  }

  async getTotalRevenue() {
    const assinaturas = await this.prisma.assinatura.findMany({
      where: {
        status: 'active',
      },
      include: {
        plano: true,
      },
    });

    return assinaturas.reduce((total, assinatura) => total + assinatura.plano.preco, 0);
  }

  async getPlanosStats() {
    const planos = await this.prisma.plano.findMany({
      include: {
        _count: {
          select: {
            assinaturas: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
    });

    return planos.map(plano => ({
      id: plano.id,
      nome: plano.nome,
      preco: plano.preco,
      assinantes: plano._count.assinaturas,
      receita: plano.preco * plano._count.assinaturas,
    }));
  }

  async getRecentTenants() {
    const tenants = await this.prisma.tenant.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
        _count: {
          select: {
            usuarios: true,
            agendamentos: true,
          },
        },
      },
    });
    // nunca expor o hash de senha do tenant
    return tenants.map(({ senha, ...t }) => t);
  }

  async getAllTenants(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { nome: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
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
              agendamentos: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      // nunca expor o hash de senha do tenant
      tenants: tenants.map(({ senha, ...t }) => t),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTenantById(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
        usuarios: {
          include: {
            _count: {
              select: {
                agendamentos: true,
              },
            },
          },
        },
        agendamentos: {
          take: 10,
          orderBy: { data: 'desc' },
          include: {
            usuario: true,
            profissional: true,
            servicos: true,
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
    if (!tenant) return tenant;
    // remover hashes de senha do tenant e dos usuários aninhados
    const { senha, usuarios, ...rest } = tenant as any;
    return {
      ...rest,
      usuarios: (usuarios ?? []).map(({ senha: _s, ...u }: any) => u),
    };
  }

  async updateTenantStatus(id: number, ativo: boolean) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { ativo },
    });
    const { senha, ...rest } = tenant as any;
    return rest;
  }

  async getRevenueByMonth(months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenues = await this.prisma.assinatura.findMany({
      where: {
        status: 'active',
        dataInicio: {
          gte: startDate,
        },
      },
      include: {
        plano: true,
      },
    });

    // Agrupar por mês
    const monthlyRevenue = new Map();
    
    revenues.forEach(assinatura => {
      const month = assinatura.dataInicio.toISOString().substring(0, 7); // YYYY-MM
      const current = monthlyRevenue.get(month) || 0;
      monthlyRevenue.set(month, current + assinatura.plano.preco);
    });

    return Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
      month,
      revenue,
    }));
  }

  async getTopTenants(limit: number = 10) {
    return this.prisma.tenant.findMany({
      take: limit,
      orderBy: {
        agendamentos: {
          _count: 'desc',
        },
      },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
        _count: {
          select: {
            agendamentos: true,
            usuarios: true,
          },
        },
      },
    });
  }
}
