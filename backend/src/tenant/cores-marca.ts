/**
 * Paleta de cores de marca das barbearias.
 *
 * Cada barbearia nova recebe uma cor de destaque (corSecundaria) diferente das
 * que já existem, para que as landings públicas não fiquem todas iguais. As
 * cores foram escolhidas para contrastar bem com o tema escuro do sistema.
 */
export const PALETA_MARCAS = [
  '#f59e0b', // âmbar
  '#ef4444', // vermelho
  '#ec4899', // rosa
  '#8b5cf6', // violeta
  '#3b82f6', // azul
  '#06b6d4', // ciano
  '#14b8a6', // teal
  '#22c55e', // verde
  '#84cc16', // lima
  '#f97316', // laranja
  '#a855f7', // roxo
  '#10b981', // esmeralda
  '#eab308', // amarelo
  '#6366f1', // índigo
] as const;

/** Base escura padrão para a cor primária quando não informada. */
export const COR_PRIMARIA_PADRAO = '#1a1a1a';

/**
 * Escolhe a próxima cor de marca ainda não usada por outra barbearia.
 * Se todas já estiverem em uso, cicla a paleta de forma determinística
 * (usando o total de barbearias) para continuar variando.
 *
 * @param coresUsadas cores de destaque (corSecundaria) já cadastradas
 * @param total quantidade de barbearias já existentes (para o fallback cíclico)
 */
export function escolherCorMarca(
  coresUsadas: Array<string | null | undefined>,
  total: number,
): string {
  const usadas = new Set(
    coresUsadas
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase()),
  );

  const livre = PALETA_MARCAS.find((cor) => !usadas.has(cor.toLowerCase()));
  if (livre) return livre;

  return PALETA_MARCAS[total % PALETA_MARCAS.length];
}
