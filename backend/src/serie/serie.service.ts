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

/**
 * Até quando a série mantém horário criado.
 *
 * Sem um teto, cada chamada de `gerarHorarios` empurra mais oito ocorrências
 * para a frente — e a agenda de quem clicou três vezes vai parar no ano que
 * vem. Setenta dias cobrem os oito encontros semanais com folga e param aí.
 */
export const HORIZONTE_EM_DIAS = 70;

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
        ate: this.dataDeFim(dados?.ate),
        observacoes: dados?.observacoes ? String(dados.observacoes).trim() : null,
      },
    });

    const resultado = await this.gerarHorarios(serie.id);
    return { serie: { ...serie, descricao: descreverSerie(serie as any) }, ...resultado };
  }

  /**
   * Cria os próximos horários que ainda faltam desta série.
   *
   * Não duplica data — o `geradoAte` faz a próxima chamada continuar de onde
   * a anterior parou —, mas também não é um botão inofensivo: cada chamada
   * empurrava mais oito ocorrências para a frente. Três cliques seguidos
   * enfiavam vinte e quatro horários na agenda do barbeiro, chegando a
   * janeiro do ano seguinte.
   *
   * O `HORIZONTE_EM_DIAS` resolve: passado o horizonte, a chamada não faz
   * nada. A série mantém sempre uns dois meses à frente, e clicar de novo é
   * inofensivo.
   */
  async gerarHorarios(serieId: number, agora = new Date()) {
    const serie = await this.prisma.serieAgendamento.findUnique({ where: { id: serieId } });
    if (!serie) throw new NotFoundException('Série não encontrada');
    if (!serie.ativo) return { criados: [], pulados: [] };

    const limiteDoHorizonte = new Date(
      agora.getTime() + HORIZONTE_EM_DIAS * 24 * 60 * 60_000,
    );
    const datas = proximasOcorrencias(serie as any, OCORRENCIAS_ADIANTADAS, agora).filter(
      (data) => data <= limiteDoHorizonte,
    );

    // Nada a criar dentro do horizonte. Dizer isso explicitamente importa:
    // sem a marca, quem chama não distingue "a série já está em dia" de
    // "tentei e não consegui criar nada" — e a tela mostraria "0 horários
    // criados" nos dois casos.
    if (datas.length === 0) {
      return { criados: [], pulados: [], jaEstavaCheia: true };
    }

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

  /**
   * A data de fim da série, ou nulo.
   *
   * `new Date("31/12/2026")` — formato brasileiro, plausível vindo do n8n ou
   * de qualquer integração — produz `Invalid Date`, que o Prisma recusa com
   * um erro de validação e o filtro traduz para 500 "Erro interno". Erro de
   * quem chamou não pode virar erro nosso.
   */
  private dataDeFim(valor: unknown): Date | null {
    if (valor === null || valor === undefined || valor === '') return null;

    const quando = valor instanceof Date ? valor : new Date(String(valor));
    if (Number.isNaN(quando.getTime())) {
      throw new BadRequestException(
        'Data de término inválida. Use o formato 2026-12-31.',
      );
    }
    if (quando.getTime() <= Date.now()) {
      throw new BadRequestException('A data de término tem que estar no futuro.');
    }
    return quando;
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
