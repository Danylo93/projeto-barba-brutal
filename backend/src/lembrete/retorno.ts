export const DIAS_DE_RETORNO_VALIDOS = [15, 20, 30, 40] as const;

export type DiasDeRetorno = (typeof DIAS_DE_RETORNO_VALIDOS)[number];

export interface ConfiguracaoLembreteRetorno {
  ativo: boolean;
  dias: DiasDeRetorno;
}

export const CONFIGURACAO_RETORNO_PADRAO: ConfiguracaoLembreteRetorno = {
  ativo: false,
  dias: 30,
};

/**
 * Lê o JSON do tenant sem confiar nele. Configuração antiga, incompleta ou
 * adulterada fica desativada; intervalo fora da lista nunca vira campanha.
 */
export function configuracaoDeRetorno(
  configuracoes: unknown,
): ConfiguracaoLembreteRetorno {
  const raiz =
    configuracoes && typeof configuracoes === 'object'
      ? (configuracoes as Record<string, unknown>)
      : {};
  const valor =
    raiz.lembreteRetorno && typeof raiz.lembreteRetorno === 'object'
      ? (raiz.lembreteRetorno as Record<string, unknown>)
      : {};
  const dias = Number(valor.dias);
  const diasValidos = (DIAS_DE_RETORNO_VALIDOS as readonly number[]).includes(dias);

  return {
    ativo: valor.ativo === true && diasValidos,
    dias: diasValidos ? (dias as DiasDeRetorno) : CONFIGURACAO_RETORNO_PADRAO.dias,
  };
}

export function configuracaoDeRetornoValida(valor: unknown): boolean {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const registro = valor as Record<string, unknown>;
  return (
    typeof registro.ativo === 'boolean' &&
    (DIAS_DE_RETORNO_VALIDOS as readonly number[]).includes(Number(registro.dias))
  );
}
