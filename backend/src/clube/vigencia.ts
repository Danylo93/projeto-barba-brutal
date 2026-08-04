/**
 * Vigência da assinatura do clube — funções puras, sem Nest nem Prisma.
 *
 * O `status` gravado conta a história do PAGAMENTO ('pendente', 'ativa',
 * 'cancelada') e nunca mudava sozinho: não existe job que expire assinatura.
 * Resultado, tudo silencioso:
 *
 * - o painel do dono somava como "receita recorrente" gente que pagou uma vez,
 *   meses atrás, e nunca mais voltou;
 * - o cliente continuava vendo "assinatura ativa" muito depois do fim;
 * - e, como assinar é bloqueado por já ter uma ativa, quem pagou uma vez
 *   nunca mais conseguia RENOVAR;
 * - quem gerou o Pix e desistiu ficava travado para sempre no "aguardando
 *   pagamento".
 *
 * Em vez de um cron (que no plano free do Render nem roda com o serviço
 * dormindo), a vigência é derivada do `fim` na hora da leitura. O banco guarda
 * o fato; a situação é calculada.
 */

/** Pix não pago vira abandono: não pode travar o cliente para sempre. */
export const HORAS_ATE_O_PIX_VENCER = 24;

export type SituacaoClube = 'pendente' | 'ativa' | 'expirada' | 'cancelada' | 'abandonada';

export interface AssinaturaParaVigencia {
  status: string;
  fim?: Date | string | null;
  createdAt?: Date | string | null;
}

function paraData(valor: Date | string | null | undefined): Date | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function situacaoDaAssinatura(
  assinatura: AssinaturaParaVigencia,
  agora: Date = new Date(),
): SituacaoClube {
  const status = (assinatura?.status ?? '').trim().toLowerCase();

  if (status === 'cancelada') return 'cancelada';

  if (status === 'pendente') {
    const criada = paraData(assinatura.createdAt);
    if (!criada) return 'pendente';
    const vence = new Date(criada.getTime() + HORAS_ATE_O_PIX_VENCER * 3600_000);
    return vence >= agora ? 'pendente' : 'abandonada';
  }

  if (status === 'ativa') {
    const fim = paraData(assinatura.fim);
    // Sem data de fim gravada, não dá para dizer que venceu — vale.
    if (!fim) return 'ativa';
    return fim >= agora ? 'ativa' : 'expirada';
  }

  return 'expirada';
}

/** O cliente tem direito aos benefícios do clube agora? */
export function estaVigente(
  assinatura: AssinaturaParaVigencia,
  agora: Date = new Date(),
): boolean {
  return situacaoDaAssinatura(assinatura, agora) === 'ativa';
}

/**
 * Esta assinatura impede o cliente de contratar de novo?
 *
 * Só a que está valendo agora e o Pix ainda dentro do prazo. Expirada e
 * abandonada liberam — é assim que a renovação passa a ser possível.
 */
export function impedeNovaAssinatura(
  assinatura: AssinaturaParaVigencia,
  agora: Date = new Date(),
): boolean {
  const situacao = situacaoDaAssinatura(assinatura, agora);
  return situacao === 'ativa' || situacao === 'pendente';
}
