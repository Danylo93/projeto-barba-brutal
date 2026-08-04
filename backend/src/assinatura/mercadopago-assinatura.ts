/**
 * Montagem dos payloads da API de Assinaturas (preapproval) do Mercado Pago.
 *
 * Fica separado do serviço porque é lógica pura: dado um plano nosso, produz o
 * corpo que a API espera. Assim dá para testar o formato sem chamar o Mercado
 * Pago — que é o único jeito de testar isso sem credencial de produção.
 *
 * Referência:
 * https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan
 */

/** Tópicos de webhook que a API de assinaturas envia. */
export type TopicoAssinatura =
  | 'subscription_preapproval'
  | 'subscription_authorized_payment'
  | 'payment';

export interface PlanoLocal {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
}

/**
 * Corpo de POST /preapproval_plan.
 *
 * `payment_methods_allowed` fica de fora de propósito: sem a restrição, o
 * Mercado Pago oferece tudo que a conta do vendedor tem habilitado (cartão de
 * crédito, débito, saldo em conta e Pix). Restringir aqui só serviria para
 * tirar opção de pagamento do assinante.
 */
export function corpoDoPlano(plano: PlanoLocal, backUrl: string) {
  return {
    reason: `Barbearia Brutal — Plano ${plano.nome}`,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months' as const,
      // 30 dias de teste antes da primeira cobrança: é o que a landing promete.
      free_trial: {
        frequency: 30,
        frequency_type: 'days' as const,
      },
      transaction_amount: Number(plano.preco.toFixed(2)),
      currency_id: 'BRL' as const,
    },
    back_url: backUrl,
  };
}

/**
 * Corpo de POST /preapproval **sem plano associado**, com status `pending`.
 *
 * Por que sem plano associado: com `preapproval_plan_id`, a API do Mercado
 * Pago exige `card_token_id` — ou seja, só cartão, e com os dados do cartão
 * passando pelas nossas telas. Sem o plano, a assinatura nasce pendente e o
 * Mercado Pago devolve um `init_point`; lá o barbeiro escolhe cartão ou Pix,
 * e nada de cartão toca o nosso servidor.
 *
 * A recorrência vai embutida aqui, então cada assinatura carrega a própria
 * configuração — e o `external_reference` é nosso, que é como o webhook
 * descobre de quem é a assinatura.
 */
export function corpoDaAssinatura(dados: {
  plano: PlanoLocal;
  emailDoPagador: string;
  tenantId: number;
  backUrl: string;
  /** Primeira cobrança; use o fim do teste grátis para não cobrar antes. */
  primeiraCobranca: Date;
}) {
  return {
    reason: `Barbearia Brutal — Plano ${dados.plano.nome}`,
    payer_email: dados.emailDoPagador,
    external_reference: referenciaExterna(dados.tenantId, dados.plano.id),
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months' as const,
      // Só começa a cobrar quando o teste acaba.
      start_date: dados.primeiraCobranca.toISOString(),
      transaction_amount: Number(dados.plano.preco.toFixed(2)),
      currency_id: 'BRL' as const,
    },
    back_url: dados.backUrl,
    status: 'pending' as const,
  };
}

/** `tenantId:planoId` — formato curto e fácil de conferir no painel do MP. */
export function referenciaExterna(tenantId: number, planoId: number): string {
  return `bb-${tenantId}-${planoId}`;
}

export function lerReferenciaExterna(
  valor: string | null | undefined,
): { tenantId: number; planoId: number } | null {
  const m = /^bb-(\d+)-(\d+)$/.exec((valor || '').trim());
  if (!m) return null;
  return { tenantId: Number(m[1]), planoId: Number(m[2]) };
}

/**
 * Descobre o que a notificação está dizendo.
 *
 * O Mercado Pago manda o tópico ora em `type`, ora em `topic`, e o id ora em
 * `data.id`, ora em `id` na query — depender de um formato só é receita para
 * perder notificação em silêncio.
 */
export function interpretarNotificacao(
  corpo: any,
  query: any = {},
): { topico: TopicoAssinatura | null; id: string | null } {
  const bruto = String(
    corpo?.type ?? corpo?.topic ?? query?.type ?? query?.topic ?? '',
  ).trim();
  const id = String(
    corpo?.data?.id ?? corpo?.id ?? query?.['data.id'] ?? query?.id ?? '',
  ).trim();

  const topicos: TopicoAssinatura[] = [
    'subscription_preapproval',
    'subscription_authorized_payment',
    'payment',
  ];
  const topico = topicos.includes(bruto as TopicoAssinatura)
    ? (bruto as TopicoAssinatura)
    : null;

  return { topico, id: id || null };
}

/**
 * Status de assinatura do Mercado Pago traduzido para o nosso.
 *
 * `pending` no MP quer dizer "criada, esperando o assinante autorizar" — não
 * é assinatura válida, e tratá-la como válida liberaria o sistema de graça.
 */
export function traduzirStatus(statusMp: string): 'active' | 'canceled' | 'pending' {
  switch ((statusMp || '').toLowerCase()) {
    case 'authorized':
      return 'active';
    case 'paused':
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    default:
      return 'pending';
  }
}

/**
 * Este pagamento renova o plano da barbearia?
 *
 * Não renova o adicional de domínio próprio: é taxa única de um serviço à
 * parte, não mensalidade. A trava existia só no caminho do "já paguei —
 * verificar"; o webhook do Mercado Pago chamava `ativarAssinaturaPaga` direto,
 * então quem pagava R$ 59,90 pelo domínio ganhava 30 dias de plano de graça —
 * até R$ 159,90 no Premium — sem nada na tela indicando isso.
 */
export const METODOS_QUE_NAO_RENOVAM = ['pix_dominio'] as const;

export function pagamentoRenovaPlano(pagamento: { metodo?: string | null }): boolean {
  const metodo = (pagamento?.metodo ?? '').trim().toLowerCase();
  return !(METODOS_QUE_NAO_RENOVAM as readonly string[]).includes(metodo);
}
