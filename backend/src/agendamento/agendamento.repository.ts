import { Injectable } from '@nestjs/common';
import { Agendamento, RepositorioAgendamento } from '../types';
import { PrismaService } from 'src/db/prisma.service';

const MINUTOS_POR_SLOT = 30;

/** Formato de leitura consumido pelo frontend (serviços/usuário como objetos). */
function paraLeitura(agendamento: any) {
  return {
    id: agendamento.id,
    data: agendamento.data,
    profissionalId: agendamento.profissionalId,
    profissional: agendamento.profissional
      ? { id: agendamento.profissional.id, nome: agendamento.profissional.nome }
      : undefined,
    servicos: (agendamento.servicos ?? []).map((servico: any) => ({
      id: servico.id,
      nome: servico.nome,
      preco: servico.preco,
      qtdeSlots: servico.qtdeSlots,
      duracao: (servico.qtdeSlots ?? 1) * MINUTOS_POR_SLOT,
    })),
    usuarioId: agendamento.usuarioId,
    usuario: agendamento.usuario
      ? {
          id: agendamento.usuario.id,
          nome: agendamento.usuario.nome,
          email: agendamento.usuario.email,
        }
      : undefined,
    tenantId: agendamento.tenantId,
    status: agendamento.status,
    observacoes: agendamento.observacoes,
    createdAt: agendamento.createdAt,
    updatedAt: agendamento.updatedAt,
  };
}

@Injectable()
export class AgendamentoRepository implements RepositorioAgendamento {
  constructor(private readonly prismaService: PrismaService) {}

  async salvar(agendamento: Agendamento): Promise<void> {
    await this.prismaService.agendamento.create({
      data: {
        data: agendamento.data,
        tenantId: agendamento.tenantId,
        usuarioId: agendamento.usuarioId,
        profissionalId: agendamento.profissionalId,
        servicos: {
          connect: agendamento.servicos.map((servicoId) => ({ id: servicoId })),
        },
        status: agendamento.status || 'agendado',
        observacoes: agendamento.observacoes,
      },
    });
  }

  async buscarPorUsuario(usuarioId: number): Promise<Agendamento[]> {
    const agendamentos = await this.prismaService.agendamento.findMany({
      where: {
        usuarioId,
        data: {
          gte: new Date(),
        },
      },
      include: {
        servicos: true,
        profissional: true,
        usuario: true,
      },
      orderBy: {
        data: 'desc',
      },
    });

    return agendamentos.map(paraLeitura) as unknown as Agendamento[];
  }

  async buscarPorProfissional(profissionalId: number, data: Date): Promise<Agendamento[]> {
    const ano = data.getFullYear();
    const mes = data.getUTCMonth();
    const dia = data.getUTCDate();

    const inicioDoDia = new Date(ano, mes, dia, 0, 0, 0);
    const fimDoDia = new Date(ano, mes, dia, 23, 59, 59);

    const agendamentos = await this.prismaService.agendamento.findMany({
      where: {
        profissionalId,
        data: {
          gte: inicioDoDia,
          lte: fimDoDia,
        },
      },
      include: { 
        servicos: true, 
        usuario: true 
      },
    });

    return agendamentos.map(paraLeitura) as unknown as Agendamento[];
  }

  async buscarPorEmail(email: string, tenantId: number): Promise<Agendamento[]> {
    const agendamentos = await this.prismaService.agendamento.findMany({
      where: {
        tenantId,
        usuario: {
          email: email,
        },
        data: {
          gte: new Date(),
        },
      },
      include: {
        servicos: true,
        profissional: true,
        usuario: true,
      },
      orderBy: {
        data: 'desc',
      },
    });

    return agendamentos.map(paraLeitura) as unknown as Agendamento[];
  }

  async buscarPorProfissionalEData(
    profissional: number,
    data: Date,
    tenantId: number,
  ): Promise<Agendamento[]> {
    return this.buscarPorProfissional(profissional, data);
  }

  async buscarPorId(id: number, tenantId: number): Promise<Agendamento | null> {
    const agendamento = await this.prismaService.agendamento.findUnique({
      where: {
        id,
        tenantId,
      },
      include: {
        servicos: true,
        profissional: true,
        usuario: true,
      },
    });
    if (!agendamento) return null;
    return paraLeitura(agendamento) as unknown as Agendamento;
  }

  async excluir(id: number, tenantId: number): Promise<void> {
    await this.prismaService.agendamento.delete({
      where: {
        id: id,
        tenantId,
      },
    });
  }

  async atualizarStatus(id: number, tenantId: number, status: string): Promise<void> {
    await this.prismaService.agendamento.update({
      where: {
        id: id,
        tenantId,
      },
      data: {
        status,
      },
    });
  }

  async buscarPorUsuarioProfissional(usuarioId: number, tenantId: number): Promise<Agendamento[]> {
    const agendamentos = await this.prismaService.agendamento.findMany({
      where: {
        tenantId,
        profissional: {
          usuarioId: usuarioId,
        },
        data: {
          gte: new Date(),
        },
      },
      include: {
        servicos: true,
        profissional: true,
        usuario: true,
      },
      orderBy: {
        data: 'desc',
      },
    });

    return agendamentos.map(paraLeitura) as unknown as Agendamento[];
  }
}

