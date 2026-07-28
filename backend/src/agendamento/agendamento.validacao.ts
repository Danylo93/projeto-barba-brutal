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
