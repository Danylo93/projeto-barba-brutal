import { BadRequestException, Injectable } from '@nestjs/common';
import { Agendamento, RepositorioAgendamento } from '../types';
import { PrismaService } from 'src/db/prisma.service';
import {
  validarServicosDoAgendamento,
  validarDataDoAgendamento,
  normalizarIdsDeServico,
  duracaoEmMinutos,
  haConflito,
} from './agendamento.validacao';

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

  async salvar(agendamento: Agendamento): Promise<number> {
    await this.validarRegras(agendamento);

    const criado = await this.prismaService.agendamento.create({
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
    return criado.id;
  }

  /**
   * Aplica as regras de negócio antes de gravar: serviços válidos do tenant,
   * profissional válido, combo exclusivo e serviço realizado pelo profissional.
   */
  private async validarRegras(agendamento: Agendamento): Promise<void> {
    // 1) Formato do payload — evita 500 quando o corpo vem malformado
    //    (ex.: serviços como objetos em vez de ids).
    const idsServicos = normalizarIdsDeServico(agendamento.servicos as unknown);
    if (!idsServicos) {
      throw new BadRequestException(
        'Serviços inválidos: envie uma lista de ids de serviço.',
      );
    }
    agendamento.servicos = idsServicos;

    if (!Number.isInteger(agendamento.profissionalId) || agendamento.profissionalId <= 0) {
      throw new BadRequestException('Profissional inválido.');
    }

    // 2) Data precisa existir e estar no futuro.
    const erroData = validarDataDoAgendamento(agendamento.data as unknown as Date);
    if (erroData) {
      throw new BadRequestException(erroData);
    }
    const inicio = new Date(agendamento.data as unknown as string);
    agendamento.data = inicio as unknown as Date;

    // 3) Serviços válidos e do mesmo tenant.
    const servicos = await this.prismaService.servico.findMany({
      where: { id: { in: idsServicos }, tenantId: agendamento.tenantId },
      select: { id: true, ehCombo: true, qtdeSlots: true },
    });
    if (servicos.length !== idsServicos.length) {
      throw new BadRequestException('Um ou mais serviços são inválidos.');
    }

    const profissional = await this.prismaService.profissional.findFirst({
      where: { id: agendamento.profissionalId, tenantId: agendamento.tenantId },
      include: { servicos: { select: { id: true } } },
    });
    if (!profissional) {
      throw new BadRequestException('Profissional inválido.');
    }

    // 4) Combo exclusivo + serviço realizado pelo profissional.
    const erro = validarServicosDoAgendamento(
      servicos,
      profissional.servicos.map((s) => s.id),
    );
    if (erro) {
      throw new BadRequestException(erro);
    }

    // 5) Conflito de horário: o profissional não pode ter dois atendimentos
    //    sobrepostos. Considera a duração de cada agendamento (slots × 30 min).
    const duracaoMin = duracaoEmMinutos(servicos);
    await this.garantirHorarioLivre(agendamento, inicio, duracaoMin);

    // 6) Bloqueios de agenda (folga, almoço, férias, feriado).
    await this.garantirSemBloqueio(agendamento, inicio, duracaoMin);
  }

  /**
   * Recusa o agendamento quando o intervalo cai em um bloqueio do profissional
   * ou da barbearia inteira (profissionalId nulo).
   */
  private async garantirSemBloqueio(
    agendamento: Agendamento,
    inicio: Date,
    duracaoMin: number,
  ): Promise<void> {
    const fim = new Date(inicio.getTime() + duracaoMin * 60000);

    const bloqueio = await this.prismaService.bloqueio.findFirst({
      where: {
        tenantId: agendamento.tenantId,
        OR: [{ profissionalId: agendamento.profissionalId }, { profissionalId: null }],
        // Sobreposição: começa antes do fim do atendimento e termina depois do início.
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { motivo: true, profissionalId: true },
    });

    if (bloqueio) {
      const quem = bloqueio.profissionalId ? 'O profissional' : 'A barbearia';
      const motivo = bloqueio.motivo ? ` (${bloqueio.motivo})` : '';
      throw new BadRequestException(
        `${quem} não está disponível neste horário${motivo}. Escolha outro horário.`,
      );
    }
  }

  /** Bloqueios que afetam um profissional em um dia — usado na disponibilidade. */
  async buscarBloqueios(
    profissionalId: number,
    data: Date,
  ): Promise<{ inicio: Date; fim: Date }[]> {
    const inicioDoDia = new Date(data);
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(data);
    fimDoDia.setHours(23, 59, 59, 999);

    const bloqueios = await this.prismaService.bloqueio.findMany({
      where: {
        OR: [{ profissionalId }, { profissionalId: null }],
        inicio: { lte: fimDoDia },
        fim: { gte: inicioDoDia },
      },
      select: { inicio: true, fim: true },
    });

    return bloqueios.map((b) => ({ inicio: new Date(b.inicio), fim: new Date(b.fim) }));
  }

  /**
   * Impede agenda dupla: procura atendimentos do mesmo profissional no mesmo dia
   * e recusa se algum se sobrepõe ao novo intervalo.
   */
  private async garantirHorarioLivre(
    agendamento: Agendamento,
    inicio: Date,
    duracaoMin: number,
    ignorarId?: number,
  ): Promise<void> {
    // Janela de um dia ao redor do horário — barato de consultar e suficiente,
    // já que um atendimento não passa de algumas horas.
    const de = new Date(inicio.getTime() - 24 * 60 * 60000);
    const ate = new Date(inicio.getTime() + 24 * 60 * 60000);

    const existentes = await this.prismaService.agendamento.findMany({
      where: {
        profissionalId: agendamento.profissionalId,
        tenantId: agendamento.tenantId,
        status: { in: ['agendado', 'confirmado'] },
        data: { gte: de, lte: ate },
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
      select: { data: true, servicos: { select: { qtdeSlots: true } } },
    });

    const novo = { inicio, duracaoMin };
    const conflitante = existentes.find((e) =>
      haConflito(novo, {
        inicio: new Date(e.data),
        duracaoMin: duracaoEmMinutos(e.servicos),
      }),
    );

    if (conflitante) {
      const hora = new Date(conflitante.data).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new BadRequestException(
        `Este profissional já tem um atendimento às ${hora}. Escolha outro horário.`,
      );
    }
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

