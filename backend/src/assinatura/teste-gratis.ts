/**
 * Quantos dias dura o teste grátis.
 *
 * Este número não se escreve à mão em lugar nenhum. Ele estava em vinte
 * pontos diferentes — e-mail, WhatsApp, landing, FAQ, o `free_trial` do
 * Mercado Pago —, todos com "30" digitado no meio do texto. Mudar o prazo
 * significava caçar cada um deles, e o que sobrasse viraria promessa falsa
 * para o cliente: a landing dizendo um prazo e a cobrança caindo em outro.
 *
 * Quem mostra o prazo importa daqui.
 */
export const DIAS_TESTE_GRATIS = 14;

export function testeGratisVigente(
  assinatura: { status?: string | null; dataFim?: Date | string | null } | null | undefined,
  agora = new Date(),
): boolean {
  if (assinatura?.status !== 'trialing' || !assinatura.dataFim) return false;
  return new Date(assinatura.dataFim).getTime() > agora.getTime();
}
