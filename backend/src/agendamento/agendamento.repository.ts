import { BadRequestException, Injectable } from '@nestjs/common';
import { Agendamento, RepositorioAgendamento } from '../types';
import { PrismaService } from '../db/prisma.service';
import {
  validarServicosDoAgendamento,
  validarDataDoAgendamento,
  normalizarIdsDeServico,
  duracaoEmMinutos,
  haConflito,
  validarDentroDoExpediente,
  janelaDoDiaEmBrasilia,
  diaPedidoEmBrasilia,
} from './agendamento.validacao';
import { totalDoAtendimento, valorCobrado, valorDoServicoNoAgendamento } from '../servico/preco';

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
    // Preço congelado no ato do agendamento — é o que o cliente combinou.
    // Mostrar o preço de hoje faria a tela discordar da comanda.
    servicos: (agendamento.servicos ?? []).map((servico: any) => ({
      id: servico.id,
      nome: servico.nome,
      preco: valorDoServicoNoAgendamento(agendamento, servico),
      precoAtual: servico.preco,
      qtdeSlots: servico.qtdeSlots,
      duracao: (servico.qtdeSlots ?? 1) * MINUTOS_POR_SLOT,
    })),
    valorTotal: valorCobrado(agendamento),
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
    return this.naAgendaDoProfissional(
      agendamento.profissionalId,
      async (tx) => {
        const { valorTotal, precosServicos } = await this.validarRegras(
          agendamento,
          tx,
        );

        const criado = await tx.agendamento.create({
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
            // Congela o combinado: a barbearia pode reajustar a tabela amanhã,
            // este atendimento não muda junto.
            valorTotal,
            precosServicos,
          },
        });
        return criado.id;
      },
    );
  }

  /**
   * Roda a validação e a gravação numa transação só, com a agenda daquele
   * profissional travada.
   *
   * Antes a checagem de conflito era um `findMany` e a gravação vinha depois,
   * solta. Dois clientes tocando no mesmo horário no mesmo instante passavam
   * os DOIS pela checagem — nenhum dos dois tinha gravado ainda — e viravam
   * dois atendimentos no mesmo slot. Reproduzido: duas requisições
   * simultâneas, dois 201.
   *
   * A trava é do Postgres e vale por transação, então segura mesmo com mais de
   * uma instância do backend no ar, e é por profissional: a agenda de um não
   * atrasa a do outro. `profissional.id` é único no banco inteiro, então não
   * há barbearia esbarrando na trava de outra.
   */
  private naAgendaDoProfissional<T>(
    profissionalId: number,
    trabalho: (tx: any) => Promise<T>,
  ): Promise<T> {
    // Id inválido nem chega a abrir transação: `validarRegras` recusa depois,
    // com a mensagem certa.
    if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
      throw new BadRequestException('Profissional inválido.');
    }

    return this.prismaService.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${profissionalId}::bigint)`;
        return trabalho(tx);
      },
      // Folga para a espera na trava somada à latência do banco: o padrão de
      // 5s do Prisma é curto para o Neon em hora cheia.
      { timeout: 20_000, maxWait: 15_000 },
    );
  }

  /**
   * Aplica as regras de negócio antes de gravar: serviços válidos do tenant,
   * profissional válido, combo exclusivo e serviço realizado pelo profissional.
   *
   * Devolve o valor a congelar, com o preço que a barbearia cobra hoje.
   */
  private async validarRegras(
    agendamento: Agendamento,
    /** Cliente da transação — as leituras precisam enxergar a trava. */
    db: any = this.prismaService,
  ): Promise<{ valorTotal: number; precosServicos: Record<string, number> }> {
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

    // 3) Serviços válidos, ativos e do mesmo tenant. Sem o `ativo`, o serviço
    //    que o dono tirou da vitrine continuava agendável por quem chamasse a
    //    API direto.
    const servicos = await db.servico.findMany({
      where: { id: { in: idsServicos }, tenantId: agendamento.tenantId, ativo: true },
      select: { id: true, ehCombo: true, qtdeSlots: true, preco: true },
    });
    if (servicos.length !== idsServicos.length) {
      throw new BadRequestException('Um ou mais serviços são inválidos.');
    }

    const profissional = await db.profissional.findFirst({
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

    // 5) Dentro do expediente daquela barbearia. A tela já esconde os
    //    horários fechados, mas quem chama a API direto passava por cima:
    //    havia agendamento marcado em domingo às 4h da manhã.
    const duracaoMin = duracaoEmMinutos(servicos);
    const barbearia = await db.tenant.findUnique({
      where: { id: agendamento.tenantId },
      select: { configuracoes: true },
    });
    const erroExpediente = validarDentroDoExpediente(
      inicio,
      duracaoMin,
      barbearia?.configuracoes,
    );
    if (erroExpediente) {
      throw new BadRequestException(erroExpediente);
    }

    // 6) Conflito de horário: o profissional não pode ter dois atendimentos
    //    sobrepostos. Considera a duração de cada agendamento (slots × 30 min).
    //    Ao remarcar, o próprio agendamento não conta como conflito.
    await this.garantirHorarioLivre(
      agendamento,
      inicio,
      duracaoMin,
      (agendamento as any).id,
      db,
    );

    // 6) Bloqueios de agenda (folga, almoço, férias, feriado).
    await this.garantirSemBloqueio(agendamento, inicio, duracaoMin, db);

    const { total, porServico } = totalDoAtendimento(servicos);
    return { valorTotal: total, precosServicos: porServico };
  }

  /**
   * Recusa o agendamento quando o intervalo cai em um bloqueio do profissional
   * ou da barbearia inteira (profissionalId nulo).
   */
  private async garantirSemBloqueio(
    agendamento: Agendamento,
    inicio: Date,
    duracaoMin: number,
    db: any = this.prismaService,
  ): Promise<void> {
    const fim = new Date(inicio.getTime() + duracaoMin * 60000);

    const bloqueio = await db.bloqueio.findFirst({
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
    data: Date | string,
    tenantId: number,
  ): Promise<{ inicio: Date; fim: Date }[]> {
    // Mesmo recorte da agenda: `setHours` usa o fuso do processo, que no
    // Render é UTC, e folga marcada das 21h em diante ficava invisível.
    const pedido = diaPedidoEmBrasilia(data);
    if (!pedido) return [];
    const { inicio: inicioDoDia, fim: fimDoDia } = janelaDoDiaEmBrasilia(pedido);

    const bloqueios = await this.prismaService.bloqueio.findMany({
      where: {
        // Sem o tenantId, o bloqueio "da barbearia inteira" (profissionalId
        // nulo) de UMA barbearia derrubava horário nas outras todas.
        tenantId,
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
    db: any = this.prismaService,
  ): Promise<void> {
    // Janela de um dia ao redor do horário — barato de consultar e suficiente,
    // já que um atendimento não passa de algumas horas.
    const de = new Date(inicio.getTime() - 24 * 60 * 60000);
    const ate = new Date(inicio.getTime() + 24 * 60 * 60000);

    const existentes = await db.agendamento.findMany({
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

  /**
   * Agenda de um profissional num dia.
   *
   * `tenantId` é obrigatório: sem ele, bastava chutar um id de profissional
   * (são sequenciais) para ler a agenda de outra barbearia — com nome e
   * e-mail dos clientes dela.
   */
  async buscarPorProfissional(
    profissionalId: number,
    data: Date | string,
    tenantId: number,
  ): Promise<Agendamento[]> {
    const pedido = diaPedidoEmBrasilia(data);
    if (!pedido) return [];
    const { inicio: inicioDoDia, fim: fimDoDia } = janelaDoDiaEmBrasilia(pedido);

    const agendamentos = await this.prismaService.agendamento.findMany({
      where: {
        profissionalId,
        tenantId,
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

  async buscarPorTelefone(telefone: string, tenantId: number): Promise<Agendamento[]> {
    const agendamentos = await this.prismaService.agendamento.findMany({
      where: {
        tenantId,
        usuario: {
          telefone: telefone,
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

  async buscarIdUsuarioPorTelefone(telefone: string, tenantId: number): Promise<number | null> {
    const usuario = await this.prismaService.usuario.findFirst({
      where: {
        telefone,
        tenantId,
      },
      select: {
        id: true,
      },
    });
    return usuario?.id || null;
  }

  async buscarPorProfissionalEData(
    profissional: number,
    data: Date | string,
    tenantId: number,
  ): Promise<Agendamento[]> {
    return this.buscarPorProfissional(profissional, data, tenantId);
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

  /**
   * Remarcar passa pelas MESMAS regras de criar.
   *
   * Antes o método só fazia `update({ data })`: dava para remarcar para o
   * passado, para cima de outro atendimento e para fora do expediente — tudo
   * que o `criar` protege era contornável remarcando depois. Data inválida
   * também chegava crua no Prisma e virava 500.
   */
  async reagendar(id: number, tenantId: number, data: Date): Promise<void> {
    const atual = await this.prismaService.agendamento.findFirst({
      where: { id, tenantId },
      include: { servicos: { select: { id: true } } },
    });
    if (!atual) {
      throw new BadRequestException('Agendamento não encontrado.');
    }

    // Mesma trava de criar: remarcar também conferia o conflito e gravava
    // depois, solto. Dois clientes remarcando para o mesmo horário — ou um
    // remarcando para o horário que o outro está agendando agora — passavam
    // os dois.
    await this.naAgendaDoProfissional(atual.profissionalId, async (tx) => {
      await this.validarRegras(
        {
          id: atual.id,
          data,
          profissionalId: atual.profissionalId,
          servicos: atual.servicos.map((s) => s.id),
          usuarioId: atual.usuarioId,
          tenantId,
        } as unknown as Agendamento,
        tx,
      );

      await tx.agendamento.update({
        where: { id, tenantId },
        // O novo horário precisa gerar uma nova confirmação e um novo
        // lembrete; manter as marcas antigas fazia a alteração aparecer no
        // aplicativo, mas silenciava o WhatsApp.
        data: { data, confirmacaoEnviadaEm: null, lembreteEnviadoEm: null },
      });
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
