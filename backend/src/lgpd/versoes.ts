/**
 * Versão vigente de cada documento legal.
 *
 * Ao mudar o texto de um documento, suba a versão aqui: o consentimento é
 * registrado com a versão aceita, então dá para saber exatamente a que
 * redação cada titular consentiu — e quem precisa aceitar de novo.
 */
export const VERSAO_TERMOS = '2026-07-28';
export const VERSAO_PRIVACIDADE = '2026-07-28';
export const VERSAO_COOKIES = '2026-07-28';

/** Finalidades de consentimento aceitas pela API. */
export const TIPOS_DE_CONSENTIMENTO = [
  'cookies_analise',
  'cookies_marketing',
  'termos_de_uso',
  'politica_privacidade',
] as const;

export type TipoConsentimento = (typeof TIPOS_DE_CONSENTIMENTO)[number];

export function tipoValido(tipo: string): tipo is TipoConsentimento {
  return (TIPOS_DE_CONSENTIMENTO as readonly string[]).includes(tipo);
}

/**
 * Cookies estritamente necessários não entram em consentimento: sem eles o
 * sistema não funciona (sessão, segurança). A LGPD e a orientação da ANPD
 * dispensam consentimento para essa categoria — ela só precisa ser informada.
 */
export const COOKIES_ESSENCIAIS_DISPENSAM_CONSENTIMENTO = true;
