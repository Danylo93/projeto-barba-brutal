/**
 * Regras de negócio da seleção de serviços de um agendamento — função pura,
 * fácil de testar e reutilizar. Não depende do Nest nem do Prisma.
 */

export interface ServicoValidacao {
  id: number;
  ehCombo: boolean;
}

/**
 * Valida os serviços escolhidos para um agendamento.
 * @param servicos Serviços selecionados (com a flag ehCombo).
 * @param servicoIdsDoProfissional Ids dos serviços que o profissional realiza.
 *   Vazio significa "sem vínculo cadastrado" → aceita qualquer serviço do tenant.
 * @returns mensagem de erro, ou null quando válido.
 */
export function validarServicosDoAgendamento(
  servicos: ServicoValidacao[],
  servicoIdsDoProfissional: number[],
): string | null {
  if (!servicos || servicos.length === 0) {
    return 'Selecione ao menos um serviço.';
  }

  // Combo é exclusivo: se um combo foi escolhido, ele deve ser o único serviço.
  const temCombo = servicos.some((s) => s.ehCombo);
  if (temCombo && servicos.length > 1) {
    return 'Um combo já inclui os serviços; não o combine com outros serviços.';
  }

  // Quando o profissional tem serviços vinculados, todos os escolhidos devem estar entre eles.
  if (servicoIdsDoProfissional && servicoIdsDoProfissional.length > 0) {
    const permitidos = new Set(servicoIdsDoProfissional);
    const naoAtende = servicos.some((s) => !permitidos.has(s.id));
    if (naoAtende) {
      return 'Este profissional não realiza um dos serviços selecionados.';
    }
  }

  return null;
}

/** Duração de um slot de agenda, em minutos. */
export const MINUTOS_POR_SLOT = 30;

export interface IntervaloAgendamento {
  /** Início do atendimento. */
  inicio: Date;
  /** Duração total, em minutos. */
  duracaoMin: number;
}

/** Soma a duração dos serviços (qtdeSlots × 30 min), com mínimo de um slot. */
export function duracaoEmMinutos(servicos: Array<{ qtdeSlots?: number | null }>): number {
  const total = (servicos ?? []).reduce(
    (acc, s) => acc + (s.qtdeSlots ?? 1) * MINUTOS_POR_SLOT,
    0,
  );
  return total > 0 ? total : MINUTOS_POR_SLOT;
}

/** Fim do atendimento a partir do início e da duração. */
export function fimDoAtendimento({ inicio, duracaoMin }: IntervaloAgendamento): Date {
  return new Date(inicio.getTime() + duracaoMin * 60000);
}

/**
 * Diz se dois atendimentos do mesmo profissional se sobrepõem no tempo.
 * Encostar (um termina exatamente quando o outro começa) NÃO é conflito.
 */
export function haConflito(a: IntervaloAgendamento, b: IntervaloAgendamento): boolean {
  const fimA = fimDoAtendimento(a).getTime();
  const fimB = fimDoAtendimento(b).getTime();
  return a.inicio.getTime() < fimB && b.inicio.getTime() < fimA;
}

/**
 * Valida a data do agendamento: precisa ser uma data válida e no futuro.
 * `toleranciaMin` evita recusar por diferença de relógio entre cliente e servidor.
 */
export function validarDataDoAgendamento(
  data: Date | string | null | undefined,
  agora: Date = new Date(),
  toleranciaMin = 2,
): string | null {
  if (!data) return 'Informe a data e o horário do agendamento.';
  const quando = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(quando.getTime())) {
    return 'Data do agendamento inválida.';
  }
  if (quando.getTime() < agora.getTime() - toleranciaMin * 60000) {
    return 'Não é possível agendar em um horário que já passou.';
  }
  return null;
}

/**
 * Valida o formato dos ids de serviço vindos do corpo da requisição.
 * Evita que um payload malformado (ex.: objetos em vez de ids) derrube o servidor.
 */
export function normalizarIdsDeServico(servicos: unknown): number[] | null {
  if (!Array.isArray(servicos) || servicos.length === 0) return null;
  const ids: number[] = [];
  for (const item of servicos) {
    const id = typeof item === 'string' ? Number(item) : item;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null;
    ids.push(id);
  }
  return ids;
}

/** Fuso de Brasília: é nele que o barbeiro pensa o horário da barbearia. */
const FUSO_BRASILIA = 'America/Sao_Paulo';

/** Dia da semana (0=domingo) e hora decimal no fuso de Brasília. */
export function diaEHoraEmBrasilia(data: Date): { dia: number; hora: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_BRASILIA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const partes = Object.fromEntries(
    fmt.formatToParts(data).map((p) => [p.type, p.value]),
  );
  const dias: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const hora = Number(partes.hour) + Number(partes.minute) / 60;
  return { dia: dias[partes.weekday as string] ?? 0, hora };
}

/**
 * O expediente daquele dia, lido das configurações da barbearia.
 *
 * Aceita os dois formatos que já existem em produção: o novo (`horarios[]`,
 * com abertura e fechamento por dia) e o antigo (`diasAbertos` +
 * `horaAbertura`/`horaFechamento` iguais para todos os dias).
 */
export function expedienteDoDia(
  configuracoes: any,
  dia: number,
): { aberto: boolean; abertura: number; fechamento: number } | null {
  if (!configuracoes || typeof configuracoes !== 'object') return null;

  const horarios = (configuracoes as any).horarios;
  if (Array.isArray(horarios) && horarios.length) {
    const doDia = horarios.find((h: any) => Number(h?.dia) === dia);
    if (!doDia) return { aberto: false, abertura: 0, fechamento: 0 };
    return {
      aberto: doDia.aberto !== false,
      abertura: Number(doDia.abertura ?? 0),
      fechamento: Number(doDia.fechamento ?? 24),
    };
  }

  const diasAbertos = (configuracoes as any).diasAbertos;
  if (Array.isArray(diasAbertos)) {
    if (!diasAbertos.map(Number).includes(dia)) {
      return { aberto: false, abertura: 0, fechamento: 0 };
    }
  }

  const abertura = Number((configuracoes as any).horaAbertura);
  const fechamento = Number((configuracoes as any).horaFechamento);
  if (!Number.isFinite(abertura) || !Number.isFinite(fechamento)) return null;
  return { aberto: true, abertura, fechamento };
}

/**
 * O atendimento cabe dentro do expediente daquele dia?
 *
 * Sem isso a API aceitava agendamento em dia fechado e de madrugada — a tela
 * escondia, mas quem chamasse a API direto passava. Barbearia sem configuração
 * definida não é bloqueada: seria pior travar quem ainda não configurou nada.
 */
export function validarDentroDoExpediente(
  data: Date,
  duracaoMin: number,
  configuracoes: any,
): string | null {
  const { dia, hora } = diaEHoraEmBrasilia(data);
  const expediente = expedienteDoDia(configuracoes, dia);
  if (!expediente) return null;

  const nomes = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  if (!expediente.aberto) {
    return `A barbearia não abre ${nomes[dia]}. Escolha outro dia.`;
  }

  const fim = hora + duracaoMin / 60;
  if (hora < expediente.abertura || fim > expediente.fechamento) {
    const h = (v: number) => `${String(Math.floor(v)).padStart(2, '0')}h`;
    return `Nesse dia a barbearia atende das ${h(expediente.abertura)} às ${h(
      expediente.fechamento,
    )}. Escolha um horário dentro desse período.`;
  }
  return null;
}
