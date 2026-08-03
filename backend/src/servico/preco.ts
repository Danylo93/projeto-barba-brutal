/**
 * Resolução de preço — funções puras, sem Nest nem Prisma.
 *
 * Regra: o preço vale por barbearia (`Servico.preco`), e cada profissional
 * pode ter o próprio valor para os serviços que realiza. Quem não
 * personalizou segue o preço da barbearia, inclusive nos reajustes.
 */

export const PRECO_MAXIMO = 100000;

export interface ServicoComPreco {
  id: number;
  preco: number;
}

export interface PrecoPersonalizado {
  servicoId: number;
  preco: number;
}

/** Arredonda para centavos, fugindo do clássico 0.1 + 0.2 do ponto flutuante. */
export function centavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** servicoId → preço que ESTE profissional cobra. */
export function tabelaDePrecos(
  servicos: ServicoComPreco[],
  personalizados: PrecoPersonalizado[] = [],
): Map<number, number> {
  const tabela = new Map<number, number>();
  for (const servico of servicos) {
    tabela.set(servico.id, centavos(servico.preco ?? 0));
  }
  for (const p of personalizados) {
    // Personalização de serviço que o profissional não realiza mais é ignorada:
    // ela fica no banco, mas não entra em preço nem em total.
    if (!tabela.has(p.servicoId)) continue;
    if (!Number.isFinite(p.preco)) continue;
    tabela.set(p.servicoId, centavos(p.preco));
  }
  return tabela;
}

/** Preço de um serviço para um profissional. */
export function precoDoServico(
  servico: ServicoComPreco,
  personalizados: PrecoPersonalizado[] = [],
): number {
  return tabelaDePrecos([servico], personalizados).get(servico.id) ?? 0;
}

/**
 * Total do atendimento e o preço de cada serviço, para congelar no
 * agendamento. Sem o detalhe por serviço, o relatório de "mais vendidos"
 * não fecha com a receita.
 */
export function totalDoAtendimento(
  servicos: ServicoComPreco[],
  personalizados: PrecoPersonalizado[] = [],
): { total: number; porServico: Record<string, number> } {
  const tabela = tabelaDePrecos(servicos, personalizados);
  const porServico: Record<string, number> = {};
  let total = 0;
  for (const servico of servicos) {
    const preco = tabela.get(servico.id) ?? 0;
    porServico[String(servico.id)] = preco;
    total += preco;
  }
  return { total: centavos(total), porServico };
}

/**
 * Valida o preço digitado na tela.
 *
 * Devolve `null` quando o campo vem vazio — que é como o profissional volta
 * a usar o preço da barbearia. Lança string de erro (o controller transforma
 * em 400) quando o valor não serve.
 */
export function validarPrecoInformado(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;

  const numero = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(numero)) {
    throw new Error('Informe o preço em números (ex.: 45 ou 45,90).');
  }
  if (numero < 0) {
    throw new Error('O preço não pode ser negativo.');
  }
  if (numero > PRECO_MAXIMO) {
    throw new Error('Preço fora do limite permitido.');
  }
  return centavos(numero);
}

export interface ProfissionalDaVitrine {
  servicos: { id: number }[];
  precos: PrecoPersonalizado[];
}

/**
 * Preço a mostrar na página pública da barbearia.
 *
 * Com preço por profissional o serviço deixa de ter um valor único. A vitrine
 * mostra o MENOR entre os profissionais que realizam aquele serviço, marcado
 * como "a partir de" quando eles divergem — anunciar o preço da tabela quando
 * ninguém cobra aquilo seria propaganda enganosa.
 */
export function precosDaVitrine<T extends ServicoComPreco>(
  servicos: T[],
  profissionais: ProfissionalDaVitrine[],
): (T & { precoMinimo: number; precoMaximo: number; precoVariavel: boolean })[] {
  return servicos.map((servico) => {
    const praticados: number[] = [];
    for (const profissional of profissionais) {
      if (!profissional.servicos.some((s) => s.id === servico.id)) continue;
      praticados.push(precoDoServico(servico, profissional.precos));
    }

    // Serviço que ninguém realiza ainda: vale o preço da barbearia.
    if (praticados.length === 0) {
      const preco = centavos(servico.preco ?? 0);
      return { ...servico, precoMinimo: preco, precoMaximo: preco, precoVariavel: false };
    }

    const precoMinimo = Math.min(...praticados);
    const precoMaximo = Math.max(...praticados);
    return {
      ...servico,
      precoMinimo,
      precoMaximo,
      precoVariavel: precoMaximo !== precoMinimo,
    };
  });
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
