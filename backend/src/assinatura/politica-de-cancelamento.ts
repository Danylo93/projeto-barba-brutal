/**
 * O que acontece quando a barbearia cancela.
 *
 * Antes desta regra o cancelamento fazia a pior combinação possível: marcava a
 * assinatura como `canceled` na hora, o guard rebaixava para o plano de
 * entrada no request seguinte, e não devolvia um centavo. Quem pagou um ano
 * adiantado e cancelou no trigésimo dia perdia onze meses de acesso E o
 * dinheiro. É o tipo de coisa que vira reclamação no Procon, não churn.
 *
 * A regra aqui é a que o mercado pratica, e ela cabe em duas frases:
 *
 * 1. Até 7 dias da contratação, o dinheiro volta inteiro e o acesso encerra.
 *    É o direito de arrependimento do art. 49 do Código de Defesa do
 *    Consumidor, que vale para compra fora do estabelecimento — e compra por
 *    site é exatamente isso. Não é liberalidade nossa; é lei.
 *
 * 2. Depois disso, cancelar desliga a renovação e o acesso segue até o fim do
 *    período JÁ PAGO. Sem reembolso e sem multa.
 *
 * Repare no que a segunda regra resolve: o plano anual nunca precisou de
 * fidelidade. Fidelidade é o instrumento de quem cobra depois e teme calote —
 * aqui o ano já entrou. O que o cliente compra é tempo, e tempo comprado não
 * se tira de volta porque ele desistiu de renovar.
 */

/** Dias de arrependimento garantidos pelo CDC (art. 49). */
export const DIAS_DE_ARREPENDIMENTO = 7;

export interface AssinaturaParaCancelar {
  /** Quando este período pago começou. */
  dataInicio: Date | string;
  /** Até quando ele vale. */
  dataFim: Date | string;
  status?: string | null;
  /** Só para explicar na tela; não muda a conta. */
  meioPagamento?: string | null;
}

export type MotivoDoCancelamento =
  /** Dentro dos 7 dias: devolve tudo e encerra na hora. */
  | 'arrependimento'
  /** Fora dos 7 dias: segue até o fim do que foi pago. */
  | 'ate_o_fim_do_periodo'
  /** Teste grátis não teve pagamento, então não há o que devolver. */
  | 'teste_gratis';

export interface ResultadoDoCancelamento {
  motivo: MotivoDoCancelamento;
  /** Quanto devolver, em reais. Zero quando não há devolução. */
  reembolso: number;
  /** Até quando a barbearia continua usando o plano. */
  acessoAte: Date;
  /** O status que a assinatura passa a ter. */
  novoStatus: 'canceled' | 'active';
  /** Frase pronta para a tela e para o suporte. */
  explicacao: string;
}

function comoData(valor: Date | string): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

/** Dia 0 é o da contratação; o sétimo dia ainda vale. */
export function dentroDoArrependimento(
  dataInicio: Date | string,
  agora: Date = new Date(),
): boolean {
  const inicio = comoData(dataInicio);
  if (Number.isNaN(inicio.getTime())) return false;
  const limite = new Date(inicio);
  limite.setDate(limite.getDate() + DIAS_DE_ARREPENDIMENTO);
  return agora.getTime() <= limite.getTime();
}

/**
 * O desfecho do cancelamento.
 *
 * `valorPago` é o que entrou por este período — no anual, o ano inteiro. Ele
 * entra separado do preço do plano de propósito: quem contratou antes de um
 * reajuste pagou o preço antigo, e devolver o preço de hoje seria devolver
 * dinheiro que nunca foi cobrado.
 */
export function resultadoDoCancelamento(
  assinatura: AssinaturaParaCancelar,
  valorPago: number,
  agora: Date = new Date(),
): ResultadoDoCancelamento {
  const fim = comoData(assinatura.dataFim);
  const acessoAte = Number.isNaN(fim.getTime()) ? agora : fim;

  // Teste grátis não gerou cobrança. Devolver zero é o certo, e dizer que é
  // "arrependimento" confundiria o suporte na hora de procurar o pagamento.
  if (assinatura.status === 'trialing') {
    return {
      motivo: 'teste_gratis',
      reembolso: 0,
      acessoAte,
      novoStatus: 'canceled',
      explicacao:
        'Seu teste grátis foi encerrado. Não houve cobrança, então não há nada a devolver.',
    };
  }

  const pago = Number(valorPago);
  const temPagamento = Number.isFinite(pago) && pago > 0;

  if (temPagamento && dentroDoArrependimento(assinatura.dataInicio, agora)) {
    return {
      motivo: 'arrependimento',
      reembolso: Number(pago.toFixed(2)),
      acessoAte: agora,
      novoStatus: 'canceled',
      explicacao:
        `Cancelamento dentro dos ${DIAS_DE_ARREPENDIMENTO} dias de arrependimento: ` +
        `devolvemos os R$ ${pago.toFixed(2).replace('.', ',')} integralmente. ` +
        'O acesso encerra agora.',
    };
  }

  return {
    motivo: 'ate_o_fim_do_periodo',
    reembolso: 0,
    acessoAte,
    // Continua ATIVA até o fim: é isso que mantém a barbearia trabalhando no
    // tempo que ela já pagou. Quem desliga a cobrança é `renovacaoAutomatica`.
    novoStatus: 'active',
    explicacao:
      'A renovação automática foi desligada. Você continua com o plano até ' +
      `${acessoAte.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` +
      ', sem nova cobrança e sem multa.',
  };
}
