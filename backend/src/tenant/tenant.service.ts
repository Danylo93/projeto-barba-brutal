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
    const tenant = await this.prisma.tenant.findUnique({
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
    if (tenant) delete (tenant as any).senha; // nunca expor o hash da senha
    return tenant;
  }

  /** Todos os agendamentos do tenant (para a listagem do dono). */
  async getAgendamentos(tenantId: number) {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: { tenantId },
      include: {
        servicos: true,
        profissional: true,
        usuario: true,
      },
      orderBy: { data: 'desc' },
    });

    return agendamentos.map((a) => ({
      id: a.id,
      data: a.data,
      status: a.status,
      profissional: a.profissional ? { nome: a.profissional.nome } : undefined,
      usuario: a.usuario ? { nome: a.usuario.nome, email: a.usuario.email } : undefined,
      servicos: a.servicos.map((s) => ({ nome: s.nome, preco: s.preco })),
    }));
  }

  /** Estatísticas para o dashboard do dono (barbeiro-admin). */
  async getStats(tenantId: number) {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [clientesAtivos, agendamentosHoje, agsMes] = await Promise.all([
      this.prisma.usuario.count({
        where: { tenantId, ativo: true, barbeiro: false },
      }),
      this.prisma.agendamento.count({
        where: { tenantId, data: { gte: inicioHoje, lte: fimHoje } },
      }),
      this.prisma.agendamento.findMany({
        where: { tenantId, data: { gte: inicioMes } },
        include: { servicos: true },
      }),
    ]);

    const receitaMes = agsMes.reduce(
      (acc, ag) => acc + ag.servicos.reduce((s, sv) => s + sv.preco, 0),
      0,
    );

    return { clientesAtivos, agendamentosHoje, receitaMes };
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

  /**
   * Dados públicos da barbearia para a landing do cliente final.
   * Aceita o domínio (slug) ou o id numérico. Retorna apenas informações
   * seguras + serviços/profissionais ativos. Não expõe e-mail, cnpj, senha etc.
   */
  async getPaginaPublica(identificador: string) {
    const ehNumero = /^\d+$/.test(identificador);
    const tenant = await this.prisma.tenant.findFirst({
      where: ehNumero
        ? { id: Number(identificador), ativo: true }
        : { dominio: identificador, ativo: true },
      include: {
        servicos: {
          where: { ativo: true },
          orderBy: { preco: 'asc' },
          select: {
            id: true,
            nome: true,
            descricao: true,
            preco: true,
            qtdeSlots: true,
            ehCombo: true,
            imagemURL: true,
          },
        },
        profissionais: {
          where: { ativo: true },
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            nome: true,
            descricao: true,
            imagemUrl: true,
            avaliacao: true,
            quantidadeAvaliacoes: true,
          },
        },
      },
    });

    if (!tenant) return null;

    return {
      id: tenant.id,
      nome: tenant.nome,
      endereco: tenant.endereco,
      telefone: tenant.telefone,
      dominio: tenant.dominio,
      logo: tenant.logo,
      corPrimaria: tenant.corPrimaria,
      corSecundaria: tenant.corSecundaria,
      configuracoes: tenant.configuracoes,
      servicos: tenant.servicos,
      profissionais: tenant.profissionais,
    };
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
    configuracoes: any;
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
