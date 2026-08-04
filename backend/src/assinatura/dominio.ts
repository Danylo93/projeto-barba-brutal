/**
 * Adicional de Domínio Próprio — preço e opções.
 *
 * Não é um recurso que liga sozinho: ninguém aponta DNS por API. É um serviço
 * que alguém do suporte executa depois do pagamento. O código existe para
 * cobrar e para registrar qual serviço foi comprado; quem entrega é gente.
 *
 * Isso precisa estar dito na tela ANTES de o barbeiro pagar. Antes a oferta
 * dizia só "por apenas R$ 59,90 (taxa única)" e sumia: o dono pagava, nada
 * acontecia na conta dele, e a única saída era pedir estorno.
 */

export type OpcaoDeDominio = 'proprio' | 'novo';

export interface Dominio {
  opcao: OpcaoDeDominio;
  preco: number;
  /** Como aparece no Pix, no recibo e na lista do admin. */
  titulo: string;
  /** O que a barbearia está comprando, em uma linha. */
  resumo: string;
  /**
   * Método gravado no pagamento.
   *
   * Todos começam com `pix_dominio` de propósito: é o prefixo que impede o
   * adicional de renovar o plano de graça (ver `pagamentoRenovaPlano`).
   */
  metodo: string;
}

export const DOMINIOS: Record<OpcaoDeDominio, Dominio> = {
  proprio: {
    opcao: 'proprio',
    preco: 29.9,
    titulo: 'Domínio Próprio — configuração (você já tem o domínio)',
    resumo:
      'Você já tem o domínio registrado. A gente configura e aponta para a sua página.',
    metodo: 'pix_dominio_proprio',
  },
  novo: {
    opcao: 'novo',
    preco: 69.9,
    titulo: 'Domínio Próprio — registro e configuração (você ainda não tem)',
    resumo:
      'A gente registra o domínio no seu nome, configura e aponta para a sua página.',
    metodo: 'pix_dominio_novo',
  },
};

/**
 * Resolve a opção vinda da requisição.
 *
 * Recusa o que não conhece em vez de cair num padrão: cobrar R$ 29,90 de quem
 * pediu o registro completo seria cobrar a menos e prometer a mais.
 */
export function dominioDaOpcao(opcao: unknown): Dominio | null {
  const chave = String(opcao ?? '').trim().toLowerCase();
  return DOMINIOS[chave as OpcaoDeDominio] ?? null;
}

export const OPCOES_DE_DOMINIO = Object.values(DOMINIOS);
