import { randomUUID } from 'crypto';

/**
 * Sessão única por conta.
 *
 * Antes qualquer token assinado valia até expirar — 15 dias, de quantos
 * dispositivos fossem — e não havia como derrubar um acesso. Senha trocada,
 * barbeiro desligado, celular perdido: o token antigo continuava abrindo a
 * agenda, o financeiro e os dados dos clientes.
 *
 * O login passa a gravar um identificador de sessão na conta e a carregá-lo
 * dentro do token. Toda requisição compara os dois. Entrar de novo em outro
 * lugar derruba o anterior, que é o comportamento pedido — e de quebra dá o
 * "sair de todos os dispositivos" de graça: basta gravar outro valor.
 */

export const MOTIVO_SESSAO_ENCERRADA =
  'Sua conta foi aberta em outro dispositivo. Entre novamente para continuar.';

export function novaSessao(): string {
  return randomUUID();
}

/**
 * O token apresentado ainda é o da sessão vigente?
 *
 * Falha fechada de propósito: token sem `sid` (emitido antes desta mudança) e
 * conta sem `sessaoId` não passam. O custo é um relogin de todo mundo no
 * deploy; o contrário seria deixar uma porta aberta justamente para os tokens
 * que ninguém consegue derrubar.
 */
export function sessaoValida(
  sidDoToken: unknown,
  sessaoIdDaConta: string | null | undefined,
): boolean {
  if (typeof sidDoToken !== 'string' || !sidDoToken) return false;
  if (!sessaoIdDaConta) return false;
  return sidDoToken === sessaoIdDaConta;
}
