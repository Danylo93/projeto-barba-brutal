import { Injectable } from '@nestjs/common';
import { Agendamento, RepositorioAgendamento } from '../types';
import { PrismaService } from 'src/db/prisma.service';

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

    return agendamentos.map(agendamento => ({
      id: agendamento.id,
      data: agendamento.data,
      profissionalId: agendamento.profissionalId,
      servicos: agendamento.servicos.map(servico => servico.id),
      usuarioId: agendamento.usuarioId,
      tenantId: agendamento.tenantId,
      status: agendamento.status,
      observacoes: agendamento.observacoes,
      createdAt: agendamento.createdAt,
      updatedAt: agendamento.updatedAt,
    }));
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

    return agendamentos.map(agendamento => ({
      id: agendamento.id,
      data: agendamento.data,
      profissionalId: agendamento.profissionalId,
      servicos: agendamento.servicos.map(servico => servico.id),
      usuarioId: agendamento.usuarioId,
      tenantId: agendamento.tenantId,
      status: agendamento.status,
      observacoes: agendamento.observacoes,
      createdAt: agendamento.createdAt,
      updatedAt: agendamento.updatedAt,
    }));
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

    return agendamentos.map(agendamento => ({
      id: agendamento.id,
      data: agendamento.data,
      profissionalId: agendamento.profissionalId,
      servicos: agendamento.servicos.map(servico => servico.id),
      usuarioId: agendamento.usuarioId,
      tenantId: agendamento.tenantId,
      status: agendamento.status,
      observacoes: agendamento.observacoes,
      createdAt: agendamento.createdAt,
      updatedAt: agendamento.updatedAt,
    }));
  }

  async buscarPorProfissionalEData(
    profissional: number,
    data: Date,
    tenantId: number,
  ): Promise<Agendamento[]> {
    return this.buscarPorProfissional(profissional, data);
  }

  async excluir(id: number, tenantId: number): Promise<void> {
    await this.prismaService.agendamento.delete({
      where: {
        id: id,
        tenantId,
      },
    });
  }
}
