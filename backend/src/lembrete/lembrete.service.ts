import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  DadosDoAviso,
  mensagemSolicitacaoBarbeiro,
  mensagemSolicitacaoCliente,
  mensagemLembreteBarbeiro,
  mensagemLembreteCliente,
  mensagemLembreteRetorno,
} from '../whatsapp/mensagens';
import {
  calcularJanela,
  calcularJanelaDeConfirmacao,
  telefoneUtilizavel,
} from './janela';
import { configuracaoDeRetorno } from './retorno';

/** Quantos agendamentos um disparo processa por vez. */
const LIMITE_PADRAO = 60;

/** Um destinatário concreto: número + texto pronto. */
export interface Envio {
  agendamentoId: number;
  tenantId: number;
  para: 'cliente' | 'barbeiro';
  numero: string;
  mensagem: string;
  /**
   * Instância da Evolution da barbearia — o número de WhatsApp de onde a
   * mensagem sai. Sem ela vale o do ambiente. Faltando isso, o lembrete de
   * toda barbearia sairia de um número só.
   */
  instancia?: string | null;
}

/** Lê a instância da Evolution guardada nas configurações da barbearia. */
export function instanciaDaBarbearia(tenant: any): string | null {
  const conf = (tenant?.configuracoes as any) ?? {};
  const bruto =
    conf.evolutionInstance ?? conf.instance ?? conf.whatsappInstance ?? '';
  const limpo = String(bruto).trim();
  return limpo || null;
}

type Tipo = 'lembrete' | 'confirmacao';
type TipoDisparo = Tipo | 'retorno';

/**
 * Avisos de WhatsApp do agendamento (confirmação e lembrete de 1 hora antes).
 *
 * O que mudou e por quê:
 *
 * - As consultas eram de todas as barbearias, sem filtrar `tenant.ativo`, e
 *   sem opção de recortar por uma. Um único token dava a agenda e o telefone
 *   dos clientes do sistema inteiro.
 * - O dedup vivia no Redis, fora do banco. No lembrete, a janela era rígida
 *   (60 a 65 min): perdeu a execução, perdeu o lembrete, para sempre e sem
 *   aviso. Na confirmação, o marcador avançava ANTES do envio — Evolution
 *   recusou, cliente nunca soube. Agora o que separa enviado de pendente é a
 *   marca no banco, gravada só depois de a Evolution aceitar.
 * - Cliente sem telefone entrava na lista igual aos outros e o envio falhava
 *   lá na frente, calado. Agora vem separado, contado e registrado.
 */
@Injectable()
export class LembreteService {
  private readonly logger = new Logger(LembreteService.name);

  /**
   * Um disparo por vez, por tipo.
   *
   * A confirmação roda a cada 1 minuto e um disparo pode demorar mais do que
   * isso (a Evolution tem timeout de 15s por mensagem). Sem esta trava, duas
   * execuções do n8n se sobrepõem, leem a mesma fila e o cliente recebe a
   * mesma mensagem duas vezes. Vale para um processo — que é como o backend
   * roda hoje no Render.
   */
  private readonly emAndamento = new Set<TipoDisparo>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /** Agendamentos que ainda precisam de lembrete, com as mensagens prontas. */
  async proximos(minutosAntes: number, janelaMin: number, tenantId?: number) {
    const { de, ate, criadoAte } = calcularJanela(minutosAntes, janelaMin);

    const agendamentos = await this.buscar({
      data: { gt: de, lte: ate },
      // Só o que ainda não foi lembrado — é isto que recupera janela perdida.
      lembreteEnviadoEm: null,
      // Quem acabou de agendar não recebe "lembrete" um minuto depois.
      createdAt: { lte: criadoAte },
      ...(tenantId ? { tenantId } : {}),
    });

    return this.montar(agendamentos, 'lembrete');
  }

  /** Agendamentos criados há pouco que ainda não foram confirmados. */
  async confirmacoesPendentes(tenantId?: number) {
    const { criadoDe, aPartirDe } = calcularJanelaDeConfirmacao();

    const agendamentos = await this.buscar({
      // Confirmar depois do horário passar é pior do que não confirmar.
      data: { gt: aPartirDe },
      confirmacaoEnviadaEm: null,
      createdAt: { gte: criadoDe },
      ...(tenantId ? { tenantId } : {}),
    });

    return this.montar(agendamentos, 'confirmacao');
  }

  /**
   * Busca e envia num passo só, marcando cada agendamento assim que a
   * Evolution aceita.
   *
   * É o que o n8n chama hoje: o fluxo virou relógio, e o envio ficou onde já
   * existia tratamento de erro e log. Antes a mensagem era montada em três
   * lugares diferentes (dois nós de código e o backend), com o texto e a
   * normalização de telefone já divergindo entre eles.
   */
  async disparar(
    tipo: Tipo,
    opcoes: {
      minutosAntes?: number;
      janelaMin?: number;
      tenantId?: number;
      limite?: number;
    } = {},
  ) {
    // Sem Evolution configurada, marcar como enviado seria a pior mentira
    // possível: o agendamento sairia da fila sem ninguém ter sido avisado.
    const provedorDisponivel =
      this.whatsapp.provedorConfigurado ?? this.whatsapp.configurado;
    if (!provedorDisponivel) {
      throw new ServiceUnavailableException(
        'WhatsApp não configurado (defina EVOLUTION_URL e EVOLUTION_APIKEY).',
      );
    }

    if (this.emAndamento.has(tipo)) {
      this.logger.warn(
        `Disparo de ${tipo} ignorado: já havia um em andamento. ` +
          `Nada se perde — o pendente sai na próxima rodada.`,
      );
      return {
        tipo,
        ignorado: true,
        enviados: 0,
        falhas: 0,
        marcados: 0,
        pendentes: 0,
        semTelefone: [] as { id: number; tenantId: number; cliente: string }[],
      };
    }

    this.emAndamento.add(tipo);
    try {
      return await this.executar(tipo, opcoes);
    } finally {
      this.emAndamento.delete(tipo);
    }
  }

  private async executar(
    tipo: Tipo,
    opcoes: {
      minutosAntes?: number;
      janelaMin?: number;
      tenantId?: number;
      limite?: number;
    },
  ) {
    const pendentes =
      tipo === 'lembrete'
        ? await this.proximos(
            opcoes.minutosAntes ?? 60,
            opcoes.janelaMin ?? 5,
            opcoes.tenantId,
          )
        : await this.confirmacoesPendentes(opcoes.tenantId);

    const limite = Math.max(1, Number(opcoes.limite) || LIMITE_PADRAO);
    // Agrupa por agendamento: cliente e barbeiro do mesmo horário saem juntos,
    // e o corte do limite é por agendamento, não por mensagem.
    const porAgendamento = new Map<number, Envio[]>();
    for (const envio of pendentes.envios) {
      const lista = porAgendamento.get(envio.agendamentoId) ?? [];
      lista.push(envio);
      porAgendamento.set(envio.agendamentoId, lista);
    }

    let enviados = 0;
    let falhas = 0;
    let marcados = 0;

    for (const [agendamentoId, lista] of [...porAgendamento].slice(0, limite)) {
      // O cliente vem primeiro (é assim que `montar` ordena) e é ele quem
      // decide o resto: se a mensagem dele não sai, o agendamento não é
      // marcado e volta na rodada seguinte. Mandar a do barbeiro mesmo assim
      // faria o barbeiro receber o mesmo aviso a cada rodada, para sempre,
      // enquanto o cliente segue sem receber nada.
      let clienteRecebeu = false;

      for (const envio of lista) {
        if (envio.para === 'barbeiro' && !clienteRecebeu) {
          this.logger.warn(
            `Agendamento #${agendamentoId}: sem o aviso do cliente, o do ` +
              `barbeiro fica para a próxima rodada.`,
          );
          continue;
        }

        const ok = await this.whatsapp.enviarTexto(
          envio.numero,
          envio.mensagem,
          envio.instancia,
        );
        if (!ok) {
          falhas++;
          this.logger.warn(
            `Falhou o ${tipo} do agendamento #${agendamentoId} para o ${envio.para}.`,
          );
          continue;
        }

        enviados++;
        // Marca assim que a mensagem do cliente sai, e não no fim do laço: se
        // a chamada do n8n estourar o timeout no meio da fila, o que já saiu
        // fica marcado. Marcando só no fim, um estouro perdia todas as marcas
        // e a rodada seguinte reenviava tudo.
        if (envio.para === 'cliente') {
          clienteRecebeu = true;
          const r = await this.marcar(tipo, [agendamentoId], opcoes.tenantId);
          marcados += r.marcados;
        }
      }
    }

    this.logger.log(
      `Disparo de ${tipo}: ${enviados} enviada(s), ${falhas} falha(s), ` +
        `${marcados} agendamento(s) marcado(s), ` +
        `${pendentes.semTelefone.length} sem telefone.`,
    );

    return {
      tipo,
      ignorado: false,
      enviados,
      falhas,
      marcados,
      /** O que sobrou para a próxima rodada — falha não some, volta. */
      pendentes: Math.max(0, pendentes.total - marcados),
      semTelefone: pendentes.semTelefone,
    };
  }

  /**
   * Lembra o cliente de refazer um serviço depois do intervalo escolhido.
   *
   * Regras que evitam spam e mensagem errada:
   * - só atendimento `concluido` origina retorno;
   * - se o cliente fez ou já marcou o mesmo serviço depois, o antigo é
   *   encerrado sem envio;
   * - vários serviços vencidos do mesmo cliente viram uma única mensagem;
   * - só envia com consentimento específico e registra no banco apenas depois
   *   de a Evolution aceitar.
   *
   * Não há consulta de plano: esta automação é liberada em todos eles.
   */
  async dispararRetornos(
    opcoes: { tenantId?: number; limite?: number; agora?: Date } = {},
  ) {
    const provedorDisponivel =
      this.whatsapp.provedorConfigurado ?? this.whatsapp.configurado;
    if (!provedorDisponivel) {
      throw new ServiceUnavailableException(
        'WhatsApp não configurado (defina EVOLUTION_URL e EVOLUTION_APIKEY).',
      );
    }

    if (this.emAndamento.has('retorno')) {
      this.logger.warn('Disparo de retorno ignorado: já havia um em andamento.');
      return {
        tipo: 'retorno',
        ignorado: true,
        enviados: 0,
        falhas: 0,
        marcados: 0,
        suprimidos: 0,
        semConsentimento: 0,
        semTelefone: [] as { id: number; tenantId: number; cliente: string }[],
      };
    }

    this.emAndamento.add('retorno');
    try {
      return await this.executarRetornos(opcoes);
    } finally {
      this.emAndamento.delete('retorno');
    }
  }

  private async executarRetornos(opcoes: {
    tenantId?: number;
    limite?: number;
    agora?: Date;
  }) {
    const agora = opcoes.agora ?? new Date();
    const limite = Math.max(1, Math.min(500, Number(opcoes.limite) || LIMITE_PADRAO));
    const tenants = await this.prisma.tenant.findMany({
      where: {
        ativo: true,
        ...(opcoes.tenantId ? { id: opcoes.tenantId } : {}),
      },
      select: { id: true, nome: true, configuracoes: true },
      orderBy: { id: 'asc' },
    });

    let enviados = 0;
    let falhas = 0;
    let marcados = 0;
    let suprimidos = 0;
    let semConsentimento = 0;
    const semTelefone: { id: number; tenantId: number; cliente: string }[] = [];

    for (const tenant of tenants) {
      if (enviados >= limite) break;
      const configuracao = configuracaoDeRetorno(tenant.configuracoes);
      if (!configuracao.ativo) continue;

      const corte = new Date(
        agora.getTime() - configuracao.dias * 24 * 60 * 60 * 1000,
      );
      // Busca folgada: clientes sem consentimento continuam pendentes para o
      // caso de aceitarem depois, mas não podem esconder toda a fila seguinte.
      const candidatos = await this.prisma.agendamento.findMany({
        where: {
          tenantId: tenant.id,
          status: 'concluido',
          data: { lte: corte },
          retornoEnviadoEm: null,
        },
        select: {
          id: true,
          tenantId: true,
          usuarioId: true,
          data: true,
          usuario: { select: { id: true, nome: true, telefone: true, ativo: true } },
          servicos: { select: { id: true, nome: true } },
        },
        orderBy: { data: 'desc' },
        take: Math.max(1000, limite * 10),
      });
      if (!candidatos.length) continue;

      const usuarios = [...new Set(candidatos.map((a) => a.usuarioId))];
      const menorData = candidatos.reduce(
        (menor, a) => (a.data < menor ? a.data : menor),
        candidatos[0].data,
      );
      const posteriores = await this.prisma.agendamento.findMany({
        where: {
          tenantId: tenant.id,
          usuarioId: { in: usuarios },
          status: { in: ['agendado', 'confirmado', 'concluido'] },
          data: { gt: menorData },
        },
        select: {
          id: true,
          usuarioId: true,
          data: true,
          servicos: { select: { id: true } },
        },
      });

      const porCliente = new Map<
        number,
        {
          usuario: (typeof candidatos)[number]['usuario'];
          ids: Set<number>;
          servicos: Map<number, string>;
        }
      >();

      for (const candidato of candidatos) {
        const servicosPendentes = candidato.servicos.filter(
          (servico) =>
            !posteriores.some(
              (posterior) =>
                posterior.usuarioId === candidato.usuarioId &&
                posterior.data > candidato.data &&
                posterior.servicos.some((s) => s.id === servico.id),
            ),
        );

        if (!servicosPendentes.length || !candidato.usuario.ativo) {
          const r = await this.marcarRetornos([candidato.id], tenant.id, agora);
          suprimidos += r.marcados;
          continue;
        }

        const grupo = porCliente.get(candidato.usuarioId) ?? {
          usuario: candidato.usuario,
          ids: new Set<number>(),
          servicos: new Map<number, string>(),
        };
        grupo.ids.add(candidato.id);
        for (const servico of servicosPendentes) {
          grupo.servicos.set(servico.id, servico.nome);
        }
        porCliente.set(candidato.usuarioId, grupo);
      }

      const consentimentos = await this.prisma.consentimentoLgpd.findMany({
        where: {
          tenantId: tenant.id,
          titularTipo: 'usuario',
          titularId: { in: [...porCliente.keys()] },
          tipo: 'comunicacoes_whatsapp',
        },
        select: { titularId: true, aceito: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const ultimaEscolha = new Map<number, boolean>();
      for (const consentimento of consentimentos) {
        if (
          consentimento.titularId != null &&
          !ultimaEscolha.has(consentimento.titularId)
        ) {
          ultimaEscolha.set(consentimento.titularId, consentimento.aceito);
        }
      }

      for (const [usuarioId, grupo] of porCliente) {
        if (enviados >= limite) break;
        if (ultimaEscolha.get(usuarioId) !== true) {
          semConsentimento++;
          continue;
        }
        if (!telefoneUtilizavel(grupo.usuario.telefone)) {
          semTelefone.push({
            id: usuarioId,
            tenantId: tenant.id,
            cliente: grupo.usuario.nome,
          });
          continue;
        }

        const ok = await this.whatsapp.enviarTexto(
          grupo.usuario.telefone,
          mensagemLembreteRetorno({
            cliente: grupo.usuario.nome,
            barbearia: tenant.nome,
            servicos: [...grupo.servicos.values()].join(', '),
            dias: configuracao.dias,
          }),
          instanciaDaBarbearia(tenant),
        );
        if (!ok) {
          falhas++;
          continue;
        }

        enviados++;
        const r = await this.marcarRetornos([...grupo.ids], tenant.id, agora);
        marcados += r.marcados;
      }
    }

    this.logger.log(
      `Disparo de retorno: ${enviados} cliente(s), ${falhas} falha(s), ` +
        `${marcados} atendimento(s) marcado(s), ${suprimidos} superado(s), ` +
        `${semConsentimento} sem consentimento e ${semTelefone.length} sem telefone.`,
    );

    return {
      tipo: 'retorno',
      ignorado: false,
      enviados,
      falhas,
      marcados,
      suprimidos,
      semConsentimento,
      semTelefone,
    };
  }

  private async marcarRetornos(
    ids: number[],
    tenantId: number,
    enviadoEm = new Date(),
  ) {
    if (!ids.length) return { marcados: 0 };
    const { count } = await this.prisma.agendamento.updateMany({
      where: { id: { in: ids }, tenantId, retornoEnviadoEm: null },
      data: { retornoEnviadoEm: enviadoEm },
    });
    return { marcados: count };
  }

  /**
   * Marca o que já foi avisado.
   *
   * É o que substitui o Redis: o dedup passa a viver junto do dado, então
   * Redis fora do ar deixa de significar "manda tudo de novo" ou "não manda
   * nada". Ids de outra barbearia são ignorados quando `tenantId` vem.
   */
  async marcar(tipo: Tipo, ids: number[], tenantId?: number) {
    const limpos = (Array.isArray(ids) ? ids : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!limpos.length) return { marcados: 0 };

    const campo = tipo === 'lembrete' ? 'lembreteEnviadoEm' : 'confirmacaoEnviadaEm';

    const { count } = await this.prisma.agendamento.updateMany({
      where: {
        id: { in: limpos },
        [campo]: null,
        ...(tenantId ? { tenantId } : {}),
      },
      data: { [campo]: new Date() },
    });

    if (count !== limpos.length) {
      // Não é erro: pode ser reenvio da mesma execução. Mas fica registrado,
      // porque divergência grande aqui indica fluxo mandando id errado.
      this.logger.log(
        `Marcados (${tipo}): ${count} de ${limpos.length} ids recebidos.`,
      );
    }
    return { marcados: count };
  }

  /** Compatibilidade com quem já chamava `POST /lembretes/enviados`. */
  async marcarEnviados(ids: number[], tenantId?: number) {
    return this.marcar('lembrete', ids, tenantId);
  }

  private async buscar(filtro: Record<string, unknown>) {
    return this.prisma.agendamento.findMany({
      where: {
        status: { in: ['agendado', 'confirmado'] },
        // Barbearia desativada não manda mensagem em nome de ninguém.
        tenant: { ativo: true },
        ...filtro,
      },
      include: {
        usuario: true,
        profissional: { include: { usuario: true } },
        servicos: true,
        tenant: true,
      },
      orderBy: { data: 'asc' },
      take: 200,
    });
  }

  /** Transforma agendamentos em destinatários com texto pronto. */
  private montar(agendamentos: any[], tipo: Tipo) {
    const envios: Envio[] = [];
    const semTelefone: { id: number; tenantId: number; cliente: string }[] = [];

    for (const a of agendamentos) {
      const dados: DadosDoAviso = {
        cliente: a.usuario?.nome ?? 'Cliente',
        barbeiro: a.profissional?.nome ?? 'a equipe',
        barbearia: a.tenant?.nome ?? 'Barbearia',
        servicos: (a.servicos ?? []).map((s: any) => s.nome).join(', ') || 'Serviço',
        data: new Date(a.data).toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        }),
        horario: new Date(a.data).toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const doCliente = a.usuario?.telefone;
      const doBarbeiro = a.profissional?.usuario?.telefone;

      // Sem telefone do cliente não há aviso nenhum a dar: o barbeiro vê a
      // agenda no sistema, o cliente não vê nada. Antes isso entrava na lista
      // e falhava lá na ponta, em silêncio, e o dono nunca ficava sabendo.
      if (!telefoneUtilizavel(doCliente)) {
        semTelefone.push({
          id: a.id,
          tenantId: a.tenantId,
          cliente: dados.cliente,
        });
        continue;
      }

        const textoCliente =
          tipo === 'lembrete'
            ? mensagemLembreteCliente(dados)
            : mensagemSolicitacaoCliente(dados);

        envios.push({
          agendamentoId: a.id,
          tenantId: a.tenantId,
          para: 'cliente',
          instancia: instanciaDaBarbearia(a.tenant),
          numero: doCliente,
          mensagem: textoCliente,
        });

        if (telefoneUtilizavel(doBarbeiro)) {
        const textoBarbeiro =
          tipo === 'lembrete'
            ? mensagemLembreteBarbeiro(dados)
            : mensagemSolicitacaoBarbeiro(dados);

        envios.push({
          agendamentoId: a.id,
          tenantId: a.tenantId,
          para: 'barbeiro',
          instancia: instanciaDaBarbearia(a.tenant),
          numero: doBarbeiro,
          mensagem: textoBarbeiro,
        });
      }
    }

    if (semTelefone.length) {
      this.logger.warn(
        `${semTelefone.length} agendamento(s) sem telefone utilizável, sem ${tipo}: ` +
          semTelefone.map((s) => `#${s.id} (${s.cliente})`).join(', '),
      );
    }

    return {
      envios,
      /** Agendamentos alcançáveis — não é o número de mensagens. */
      total: new Set(envios.map((e) => e.agendamentoId)).size,
      semTelefone,
    };
  }
}
