export const DIAS_TESTE_GRATIS = 30;

export function testeGratisVigente(
  assinatura: { status?: string | null; dataFim?: Date | string | null } | null | undefined,
  agora = new Date(),
): boolean {
  if (assinatura?.status !== 'trialing' || !assinatura.dataFim) return false;
  return new Date(assinatura.dataFim).getTime() > agora.getTime();
}
