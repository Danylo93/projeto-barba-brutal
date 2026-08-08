/**
 * Como a tela lê os planos que a API devolve.
 *
 * A API devolve os seis: três planos × mensal e anual. A tela mostra três
 * cartões e um alternador. Juntar os dois lados é o trabalho daqui.
 *
 * Preço nenhum é escrito nestas telas. Ele estava digitado à mão na landing —
 * R$ 29,90 num arquivo, R$ 49,90 no banco — e o visitante via um preço e a
 * cobrança vinha outro.
 */

export type Periodicidade = 'mensal' | 'anual'

export interface PlanoDaApi {
  id: number
  nome: string
  descricao: string
  preco: number
  duracao: number
  maxUsuarios: number
  maxAgendamentos: number
  features: string[]
  ativo?: boolean
  periodicidade?: string | null
  grupo?: string | null
}

export interface PlanoAgrupado {
  chave: string
  nome: string
  descricao: string
  features: string[]
  maxUsuarios: number
  mensal?: PlanoDaApi
  anual?: PlanoDaApi
}

/** Acima disto, "ilimitado" — o número não quer dizer nada para quem lê. */
export const LIMITE_QUE_JA_E_INFINITO = 9999

export function ehIlimitado(valor: number | null | undefined): boolean {
  // Ausência de valor NÃO é "ilimitado". Prometer a mais na vitrine é o
  // tipo de erro que só aparece quando o cliente cobra a promessa.
  if (valor === null || valor === undefined) return false
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= LIMITE_QUE_JA_E_INFINITO
}

/**
 * A chave que liga a versão mensal à anual.
 *
 * Espelha `chaveDoPlano` do backend: prefere o `grupo` e só cai no nome
 * quando ele não veio. Sem isso, "Premium" e "Premium Anual" viram dois
 * cartões separados na tela.
 */
export function chaveDoPlano(plano: Pick<PlanoDaApi, 'grupo' | 'nome'>): string {
  const grupo = String(plano?.grupo ?? '').trim().toLowerCase()
  if (grupo) return grupo

  return String(plano?.nome ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+(anual|mensal)$/, '')
    .trim()
}

/** Anual é o que dura um ano — o campo `periodicidade` é só conveniência. */
export function periodicidadeDe(plano: PlanoDaApi): Periodicidade {
  if (plano?.periodicidade === 'anual' || plano?.periodicidade === 'mensal') {
    return plano.periodicidade
  }
  return Number(plano?.duracao) >= 365 ? 'anual' : 'mensal'
}

/**
 * Junta os planos da API em cartões, na ordem do mais barato para o mais caro.
 *
 * O nome do cartão é o do MENSAL, quando existe: "Premium", e não "Premium
 * Anual" — o cartão é o mesmo plano, o alternador é que muda o preço.
 */
export function agruparPlanos(planos: PlanoDaApi[]): PlanoAgrupado[] {
  const porChave = new Map<string, PlanoAgrupado>()

  for (const plano of planos ?? []) {
    if (plano?.ativo === false) continue

    const chave = chaveDoPlano(plano)
    const periodicidade = periodicidadeDe(plano)
    const atual =
      porChave.get(chave) ??
      ({
        chave,
        nome: plano.nome,
        descricao: plano.descricao,
        features: plano.features ?? [],
        maxUsuarios: plano.maxUsuarios,
      } as PlanoAgrupado)

    atual[periodicidade] = plano
    if (periodicidade === 'mensal') {
      atual.nome = plano.nome
      atual.descricao = plano.descricao
      atual.features = plano.features ?? []
      atual.maxUsuarios = plano.maxUsuarios
    }

    porChave.set(chave, atual)
  }

  return [...porChave.values()].sort(
    (a, b) => (a.mensal?.preco ?? a.anual?.preco ?? 0) - (b.mensal?.preco ?? b.anual?.preco ?? 0),
  )
}

/** O plano a cobrar, com queda para a outra periodicidade se ela não existir. */
export function planoEscolhido(
  cartao: PlanoAgrupado,
  periodicidade: Periodicidade,
): PlanoDaApi | undefined {
  return cartao[periodicidade] ?? cartao.mensal ?? cartao.anual
}

/**
 * Quanto sai por mês no plano anual.
 *
 * É este número que se compara com o mensal — dizer "R$ 699" ao lado de
 * "R$ 69,90" faz o anual parecer dez vezes mais caro.
 */
export function equivalenteMensal(precoAnual: number): number {
  return Number((precoAnual / 12).toFixed(2))
}

/** Quanto se economiza no ano. Zero quando não há as duas versões. */
export function economiaNoAno(cartao: PlanoAgrupado): number {
  if (!cartao.mensal || !cartao.anual) return 0
  return Number((cartao.mensal.preco * 12 - cartao.anual.preco).toFixed(2))
}

/** Quantos meses de desconto o anual dá — o "2 meses grátis" da tela. */
export function mesesDeGraca(cartao: PlanoAgrupado): number {
  if (!cartao.mensal || !cartao.anual) return 0
  return Math.round(economiaNoAno(cartao) / cartao.mensal.preco)
}

export function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * As linhas de benefício do cartão, sem repetir o limite de profissionais.
 *
 * O cartão montava uma linha própria a partir de `maxUsuarios` e depois
 * listava as `features` do catálogo, filtrando as que falassem em "barbeiro"
 * para não repetir. O catálogo passou a dizer "profissional", o filtro parou
 * de casar, e o Premium exibiu "Profissionais ilimitados" duas vezes seguidas
 * — o Básico exibiu "1 profissional(is)" e "1 profissional".
 *
 * A lista do catálogo já diz o limite em todos os planos, então ela manda. A
 * linha derivada só entra se NENHUMA feature falar do assunto, o que cobre
 * plano antigo gravado antes desse texto existir.
 */
export function beneficiosDoCartao(
  features: string[],
  maxUsuarios: number | null | undefined,
): string[] {
  const limpas = (features ?? []).filter((f) => String(f).trim().length > 0)
  const jaFalaDoLimite = limpas.some((f) => /barbeiro|profissional|profissionais/i.test(f))
  if (jaFalaDoLimite) return limpas

  const derivada = ehIlimitado(maxUsuarios)
    ? 'Profissionais ilimitados'
    : `${maxUsuarios} ${maxUsuarios === 1 ? 'profissional' : 'profissionais'}`
  return [derivada, ...limpas]
}

/**
 * A frase verde acima do botão.
 *
 * Era fixa em "Upgrade disponível" para todo plano que não fosse o atual —
 * inclusive nos mais baratos, onde o botão logo abaixo dizia "Fazer
 * downgrade". O cartão se contradizia sozinho.
 */
export function situacaoDoCartao(dados: {
  atual: boolean
  emTeste: boolean
  preco: number
  precoAtual: number
}): string {
  if (dados.atual) return dados.emTeste ? 'Teste grátis ativo' : 'Assinatura ativa'
  if (dados.preco > dados.precoAtual) return 'Upgrade disponível'
  if (dados.preco < dados.precoAtual) return 'Plano mais enxuto'
  return 'Mesmo valor, outra periodicidade'
}
