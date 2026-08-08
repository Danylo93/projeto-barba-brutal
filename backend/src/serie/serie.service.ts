import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { AgendamentoRepository } from '../agendamento/agendamento.repository';
import {
  descreverSerie,
  Frequencia,
  frequenciaValida,
  horaValida,
  proximasOcorrencias,
} from './recorrencia';

/**
 * Quantos horários a série mantém criados à frente.
 *
 * Oito é o meio-termo: com semanal dá dois meses de agenda, o suficiente para
 * o conflito aparecer cedo, sem entupir o calendário de quem cancelar na
 * semana que vem.
 */
export const OCORRENCIAS_ADIANTADAS = 8;

@Injectable()
export class SerieService {
  private readonly logger = new Logger(SerieService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agendamentos: AgendamentoRepository,
  ) {}

  async listar(tenantId: number) {
    const series = await this.prisma.serieAgendamento.findMany({
      where: { tenantId, ativo: true },
      include: {
        usuario: { select: { id: true, nome: true, telefone: true } },
        profissional: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return series.map((serie) => ({
      ...serie,
      descricao: descreverSerie(serie as any),
    }));
  }

  /**
   * Cria a série e já materializa os primeiros horários.
   *
   * Ocorrência que bate em conflito (outro atendimento, folga, feriado) é
   * PULADA, e não derruba a série inteira: "toda quinta" com um feriado em
   * novembro continua sendo toda quinta. O que foi pulado volta na resposta,
   * para o dono resolver aquela semana à mão em vez de descobrir no dia.
   */
  async criar(tenantId: number, dados: any) {
    const frequencia = String(dados?.frequencia ?? '').trim();
    if (!frequenciaValida(frequencia)) {
      throw new BadRequestException('Frequência inválida. Use semanal, quinzenal ou mensal.');
    }
    if (!horaValida(dados?.hora)) {
      throw new BadRequestException('Informe a hora no formato 15:00.');
    }
    const diaSemana = Number(dados?.diaSemana);
    if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      throw new BadRequestException('Informe o dia da semana, de 0 (domingo) a 6 (sábado).');
    }

    const usuarioId = Number(dados?.usuarioId);
    const profissionalId = Number(dados?.profissionalId);
    const servicoIds = this.idsDeServico(dados?.servicoIds ?? dados?.servicos);

    // Tudo tem que ser desta barbearia. Sem esta checagem, mandar o id de um
    // cliente de outro tenant criaria série cruzada entre barbearias.
    const [cliente, profissional, servicos] = await Promise.all([
      this.prisma.usuario.findFirst({ where: { id: usuarioId, tenantId }, select: { id: true } }),
      this.prisma.profissional.findFirst({
        where: { id: profissionalId, tenantId },
        select: { id: true },
      }),
      this.prisma.servico.findMany({
        where: { id: { in: servicoIds }, tenantId, ativo: true },
        select: { id: true },
      }),
    ]);
    if (!cliente) throw new BadRequestException('Cliente inválido.');
    if (!profissional) throw new BadRequestException('Profissional inválido.');
    if (servicos.length !== servicoIds.length) {
      throw new BadRequestException('Um ou mais serviços são inválidos.');
    }

    const serie = await this.prisma.serieAgendamento.create({
      data: {
        tenantId,
        usuarioId,
        profissionalId,
        servicoIds,
        frequencia: frequencia as Frequencia,
        diaSemana,
        hora: String(dados.hora).trim(),
        ate: dados?.ate ? new Date(dados.ate) : null,
        observacoes: dados?.observacoes ? String(dados.observacoes).trim() : null,
      },
    });

    const resultado = await this.gerarHorarios(serie.id);
    return { serie: { ...serie, descricao: descreverSerie(serie as any) }, ...resultado };
  }

  /**
   * Cria os próximos horários que ainda faltam desta série.
   *
   * Idempotente pelo `geradoAte`: chamar duas vezes seguidas não duplica
   * nada, porque a segunda chamada continua de onde a primeira parou.
   */
  async gerarHorarios(serieId: number, agora = new Date()) {
    const serie = await this.prisma.serieAgendamento.findUnique({ where: { id: serieId } });
    if (!serie) throw new NotFoundException('Série não encontrada');
    if (!serie.ativo) return { criados: [], pulados: [] };

    const datas = proximasOcorrencias(serie as any, OCORRENCIAS_ADIANTADAS, agora);

    const criados: Array<{ id: number; data: Date }> = [];
    const pulados: Array<{ data: Date; motivo: string }> = [];
    let ultimaGerada: Date | null = serie.geradoAte ?? null;

    for (const data of datas) {
      try {
        const id = await this.agendamentos.salvar({
          data,
          tenantId: serie.tenantId,
          usuarioId: serie.usuarioId,
          profissionalId: serie.profissionalId,
          servicos: serie.servicoIds,
          status: 'agendado',
          observacoes: serie.observacoes ?? undefined,
          serieId: serie.id,
        } as any);
        criados.push({ id, data });
        ultimaGerada = data;
      } catch (erro: any) {
        // Conflito, folga ou feriado. A série continua; esta semana é que
        // não deu.
        pulados.push({ data, motivo: erro?.message ?? 'Horário indisponível' });
        // O marcador avança mesmo assim: senão a próxima chamada tentaria de
        // novo a mesma data para sempre, e a série nunca sairia do lugar.
        ultimaGerada = data;
      }
    }

    if (ultimaGerada) {
      await this.prisma.serieAgendamento.update({
        where: { id: serie.id },
        data: { geradoAte: ultimaGerada },
      });
    }

    return { criados, pulados };
  }

  /** Roda a geração de todas as séries ativas — a rotina que mantém a agenda cheia. */
  async gerarDeTodas(agora = new Date()) {
    const series = await this.prisma.serieAgendamento.findMany({
      where: { ativo: true },
      select: { id: true },
    });

    let criados = 0;
    let pulados = 0;
    for (const { id } of series) {
      try {
        const resultado = await this.gerarHorarios(id, agora);
        criados += resultado.criados.length;
        pulados += resultado.pulados.length;
      } catch (erro: any) {
        this.logger.error(`Falha ao gerar a série ${id}: ${erro?.message ?? erro}`);
      }
    }
    return { series: series.length, criados, pulados };
  }

  /**
   * Encerra a série.
   *
   * Os horários FUTUROS são cancelados junto — é o que a pessoa quer dizer
   * com "cancelei minha recorrência". O passado fica intacto: aqueles
   * atendimentos aconteceram, foram cobrados e geraram comissão.
   */
  async encerrar(tenantId: number, serieId: number, agora = new Date()) {
    const serie = await this.prisma.serieAgendamento.findFirst({
      where: { id: serieId, tenantId },
    });
    if (!serie) throw new NotFoundException('Série não encontrada');

    const { count } = await this.prisma.agendamento.updateMany({
      where: {
        serieId,
        tenantId,
        data: { gt: agora },
        status: { in: ['agendado', 'confirmado'] },
      },
      data: { status: 'cancelado' },
    });

    await this.prisma.serieAgendamento.update({
      where: { id: serieId },
      data: { ativo: false },
    });

    return { serieId, horariosCancelados: count };
  }

  private idsDeServico(valor: unknown): number[] {
    const lista = Array.isArray(valor) ? valor : [];
    const ids = lista
      .map((item: any) => Number(typeof item === 'object' && item ? item.id : item))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length === 0) {
      throw new BadRequestException('Escolha pelo menos um serviço para a série.');
    }
    return [...new Set(ids)];
  }
}
