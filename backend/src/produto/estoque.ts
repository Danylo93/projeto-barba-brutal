/**
 * A aritmética do estoque, sem banco.
 *
 * Fica separada porque é aqui que mora o erro que ninguém percebe: saldo que
 * fica negativo, venda de produto que acabou, ajuste que soma quando devia
 * subtrair. Sendo função pura, dá para provar cada caso sem subir Postgres.
 */

export const TIPOS_DE_MOVIMENTO = ['entrada', 'venda', 'saida', 'ajuste'] as const;
export type TipoDeMovimento = (typeof TIPOS_DE_MOVIMENTO)[number];

export function tipoValido(valor: unknown): valor is TipoDeMovimento {
  return TIPOS_DE_MOVIMENTO.includes(String(valor) as TipoDeMovimento);
}

/** Movimento que aumenta o saldo. */
export function ehEntrada(tipo: TipoDeMovimento): boolean {
  return tipo === 'entrada';
}

export interface ResultadoDoMovimento {
  saldoDepois: number;
  /** Quanto de fato entrou (+) ou saiu (−). No ajuste, é a diferença. */
  variacao: number;
}

/**
 * Aplica um movimento ao saldo.
 *
 * `ajuste` é o único em que `quantidade` significa "o saldo passa a ser
 * isto", e não "some ou subtraia isto" — é o movimento da contagem de
 * prateleira, quando o número do sistema já não bate com a realidade e não
 * adianta perguntar por quê. Os outros três são relativos.
 *
 * Nada aqui deixa o saldo negativo: estoque negativo não existe na
 * prateleira, e deixar existir no banco só transforma um erro de digitação em
 * relatório errado por meses.
 */
export function aplicarMovimento(
  saldoAtual: number,
  tipo: TipoDeMovimento,
  quantidade: number,
): ResultadoDoMovimento {
  if (!Number.isInteger(quantidade)) {
    throw new Error('A quantidade tem que ser um número inteiro.');
  }

  if (tipo === 'ajuste') {
    if (quantidade < 0) throw new Error('O saldo ajustado não pode ser negativo.');
    return { saldoDepois: quantidade, variacao: quantidade - saldoAtual };
  }

  if (quantidade <= 0) {
    throw new Error('A quantidade tem que ser maior que zero.');
  }

  if (ehEntrada(tipo)) {
    return { saldoDepois: saldoAtual + quantidade, variacao: quantidade };
  }

  if (quantidade > saldoAtual) {
    throw new Error(
      `Não dá para tirar ${quantidade} de um estoque de ${saldoAtual}.`,
    );
  }

  return { saldoDepois: saldoAtual - quantidade, variacao: -quantidade };
}

/** Está na hora de comprar mais? */
export function estoqueBaixo(produto: {
  estoque: number;
  estoqueMinimo: number;
}): boolean {
  // `> 0` de propósito: mínimo zero significa "não me avise", e não "avise
  // sempre". Sem isso, todo produto recém-cadastrado nasceria em alerta.
  return produto.estoqueMinimo > 0 && produto.estoque <= produto.estoqueMinimo;
}

/** Acabou de vez. */
export function semEstoque(produto: { estoque: number }): boolean {
  return produto.estoque <= 0;
}

/**
 * Quanto a barbearia ganhou numa venda.
 *
 * Faturamento não é lucro, e produto é justamente onde essa diferença dói:
 * revender pomada por R$ 40 que custou R$ 32 é R$ 8, não R$ 40.
 */
export function lucroDaVenda(
  precoVenda: number,
  precoCusto: number,
  quantidade: number,
): number {
  return Number(((precoVenda - precoCusto) * quantidade).toFixed(2));
}

/** Quanto vale o que está parado na prateleira, pelo preço de custo. */
export function valorDoEstoque(
  produtos: Array<{ estoque: number; precoCusto: number }>,
): number {
  const total = produtos.reduce(
    (soma, p) => soma + Math.max(0, p.estoque) * (p.precoCusto || 0),
    0,
  );
  return Number(total.toFixed(2));
}
