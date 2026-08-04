/**
 * Valor do atendimento — funções puras, sem Nest nem Prisma.
 *
 * O preço é da barbearia: cada serviço tem um preço (`Servico.preco`), igual
 * para todos os profissionais. O que mora aqui é o CONGELAMENTO desse valor no
 * ato do agendamento, para o relatório do mês passado não mudar quando o dono
 * reajusta a tabela hoje.
 */

export interface ServicoComPreco {
  id: number;
  preco: number;
}

/** Arredonda para centavos, fugindo do clássico 0.1 + 0.2 do ponto flutuante. */
export function centavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Total do atendimento e o preço de cada serviço, para congelar no
 * agendamento. Sem o detalhe por serviço, o relatório de "mais vendidos"
 * não fecha com a receita.
 */
export function totalDoAtendimento(servicos: ServicoComPreco[]): {
  total: number;
  porServico: Record<string, number>;
} {
  const porServico: Record<string, number> = {};
  let total = 0;
  for (const servico of servicos) {
    const preco = centavos(servico.preco ?? 0);
    porServico[String(servico.id)] = preco;
    total += preco;
  }
  return { total: centavos(total), porServico };
}

/**
 * Quanto um agendamento vale para os relatórios.
 *
 * Prefere o valor congelado; só recalcula pelos preços de hoje nos
 * agendamentos anteriores à migração, que não têm o congelado.
 */
export function valorCobrado(agendamento: {
  valorTotal?: number | null;
  servicos?: { preco: number }[] | null;
}): number {
  if (typeof agendamento.valorTotal === 'number') {
    return centavos(agendamento.valorTotal);
  }
  return centavos((agendamento.servicos ?? []).reduce((s, sv) => s + (sv.preco ?? 0), 0));
}

/**
 * Quanto UM serviço rendeu dentro de um agendamento — usa o preço congelado
 * daquele serviço e, na falta dele, o preço de hoje.
 */
export function valorDoServicoNoAgendamento(
  agendamento: { precosServicos?: unknown },
  servico: { id: number; preco: number },
): number {
  const mapa = agendamento.precosServicos;
  if (mapa && typeof mapa === 'object') {
    const congelado = (mapa as Record<string, unknown>)[String(servico.id)];
    if (typeof congelado === 'number' && Number.isFinite(congelado)) {
      return centavos(congelado);
    }
  }
  return centavos(servico.preco ?? 0);
}
