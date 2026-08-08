/**
 * Quanto se cobra para trocar de plano no meio do ciclo.
 *
 * A fórmula antiga era `(preço novo − preço atual) × proporção que resta`.
 * Ela pressupõe, sem dizer, que os dois planos duram o mesmo tanto — e a
 * ativação sempre concede um ciclo INTEIRO do plano novo. Enquanto tudo era
 * mensal, o erro era pequeno e passava. Com plano anual virou rombo:
 *
 *     Premium mensal (R$ 99,90) → Premium Anual (R$ 999), 20 de 30 dias
 *     (999 − 99,90) × 0,667 = R$ 599,40 cobrados
 *     365 dias concedidos
 *     → R$ 399,60 a menos por barbearia
 *
 * E piorava perto do fim do ciclo: no último dia dava R$ 29,97 por um ano de
 * Premium.
 *
 * A conta certa não olha a diferença de preço. Ela cobra o plano novo por
 * inteiro — porque é um ciclo inteiro que está sendo entregue — e desconta o
 * que a barbearia já pagou e não usou do ciclo atual.
 */

export interface PlanoParaTroca {
  preco: number;
  /** Em dias. */
  duracao?: number | null;
}

export interface CicloAtual {
  dataInicio: Date;
  dataFim: Date;
}

export interface ContaDaTroca {
  /** O que vai ser cobrado agora. */
  valor: number;
  /** Preço cheio do plano novo. */
  precoDoPlano: number;
  /** Quanto do ciclo atual foi abatido. */
  credito: number;
  diasRestantes: number;
}

/** O mínimo que o Mercado Pago aceita num Pix. */
const MINIMO_COBRAVEL = 0.01;

/**
 * Quanto a barbearia já pagou e ainda não usou.
 *
 * Só o que resta do ciclo, proporcional. Assinatura em teste grátis não gera
 * crédito nenhum: não houve pagamento para abater.
 */
export function creditoDoCicloAtual(
  planoAtual: PlanoParaTroca | null | undefined,
  ciclo: CicloAtual | null | undefined,
  emTeste: boolean,
  agora: Date = new Date(),
): number {
  if (!planoAtual || !ciclo || emTeste) return 0;
  if (ciclo.dataFim <= agora) return 0;

  const totalDoCiclo = ciclo.dataFim.getTime() - ciclo.dataInicio.getTime();
  if (totalDoCiclo <= 0) return 0;

  const queResta = ciclo.dataFim.getTime() - agora.getTime();
  const proporcao = Math.min(1, Math.max(0, queResta / totalDoCiclo));

  return Number((planoAtual.preco * proporcao).toFixed(2));
}

/**
 * O que cobrar pela troca.
 *
 * Nunca devolve negativo: quem troca de um plano caro para um barato no meio
 * do ciclo não recebe dinheiro de volta por aqui — o desconto para no zero, e
 * devolução é conversa com o suporte, não efeito colateral de um clique.
 */
export function contaDaTroca(
  planoNovo: PlanoParaTroca,
  planoAtual: PlanoParaTroca | null | undefined,
  ciclo: CicloAtual | null | undefined,
  emTeste: boolean,
  agora: Date = new Date(),
): ContaDaTroca {
  const credito = creditoDoCicloAtual(planoAtual, ciclo, emTeste, agora);
  const bruto = planoNovo.preco - credito;
  const valor = Number(Math.max(MINIMO_COBRAVEL, bruto).toFixed(2));

  const diasRestantes =
    ciclo && ciclo.dataFim > agora
      ? Math.max(0, Math.ceil((ciclo.dataFim.getTime() - agora.getTime()) / 86400000))
      : 0;

  return {
    valor,
    precoDoPlano: Number(planoNovo.preco.toFixed(2)),
    credito,
    diasRestantes,
  };
}

/**
 * Como a troca se chama na tela.
 *
 * Duas armadilhas, as duas descobertas por teste:
 *
 * 1. Comparar preço CHEIO diria que ir do Premium mensal (R$ 99,90) para o
 *    Premium anual (R$ 999) é subir de plano. Não é: é o mesmo plano, pago de
 *    outro jeito.
 * 2. Comparar CUSTO POR DIA diria que essa mesma troca é um rebaixamento —
 *    porque o anual custa menos por dia, que é exatamente o desconto que ele
 *    oferece. "Fazer downgrade" no botão de quem vai pagar um ano adiantado.
 *
 * Então: mesmo plano em outra periodicidade é `periodicidade`. Só entre
 * planos diferentes faz sentido falar em subir ou descer, e aí o custo por
 * dia é a medida honesta.
 */
export function tipoDaTroca(
  planoNovo: PlanoParaTroca & { grupo?: string | null },
  planoAtual: (PlanoParaTroca & { grupo?: string | null }) | null | undefined,
): 'upgrade' | 'downgrade' | 'periodicidade' {
  if (!planoAtual) return 'upgrade';

  const grupoNovo = String(planoNovo.grupo ?? '').trim().toLowerCase();
  const grupoAtual = String(planoAtual.grupo ?? '').trim().toLowerCase();
  if (grupoNovo && grupoNovo === grupoAtual) return 'periodicidade';

  const porDia = (p: PlanoParaTroca) => p.preco / Math.max(1, Number(p.duracao) || 30);
  return porDia(planoNovo) >= porDia(planoAtual) ? 'upgrade' : 'downgrade';
}
