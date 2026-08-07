/**
 * Quantos dias dura o teste grátis, para tudo o que o visitante lê.
 *
 * O número estava digitado à mão em dez lugares da landing — hero, planos,
 * FAQ, depoimentos, CTA, home cinematográfica — e mais alguns dentro do
 * painel. Mudar o prazo virava caça ao "30", e o que sobrasse seria promessa
 * falsa: a landing anunciando um prazo e a cobrança caindo em outro.
 *
 * Este valor tem que ser o MESMO do `DIAS_TESTE_GRATIS` do backend
 * (`backend/src/assinatura/teste-gratis.ts`), que é quem realmente decide a
 * data de fim e o `free_trial` do Mercado Pago. Aqui é só o que se anuncia;
 * lá é o que acontece.
 */
export const DIAS_TESTE_GRATIS = 14;

/** "14 dias" — para escrever no meio de uma frase sem repetir o número. */
export const PRAZO_TESTE_GRATIS = `${DIAS_TESTE_GRATIS} dias`;
