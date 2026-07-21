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
