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
    const result = await this.prisma.assinatura.aggregate({
      _sum: {
        plano: {
          preco: true,
        },
      },
      where: {
        status: 'active',
      },
    });

    return result._sum.plano?.preco || 0;
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
    return this.prisma.tenant.findMany({
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
  }

  async getAllTenants(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
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
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTenantById(id: number) {
    return this.prisma.tenant.findUnique({
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
  }

  async updateTenantStatus(id: number, ativo: boolean) {
    return this.prisma.tenant.update({
      where: { id },
      data: { ativo },
    });
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
