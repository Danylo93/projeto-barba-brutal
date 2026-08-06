/**
 * Quem o token do bot de WhatsApp autoriza — e em qual barbearia.
 *
 * A regra do projeto é que o tenant vem do token, nunca da query string. Aqui
 * ela estava furada: havia um `WHATSAPP_BOT_TOKEN` global que era aceito com
 * QUALQUER `?tenantId=`. Quem tivesse esse token — o n8n, quem lesse o fluxo
 * exportado, quem visse a variável de ambiente — podia trocar o número na URL
 * e ler a agenda, os telefones dos clientes, criar e cancelar agendamento de
 * qualquer barbearia do sistema.
 *
 * Agora o token global precisa vir com a barbearia dele declarada
 * (`WHATSAPP_BOT_TENANT_ID`), e o mapa por barbearia continua sendo o caminho
 * recomendado para mais de uma.
 */

export interface ConfigDoBot {
  /** Token único, quando a instalação atende uma barbearia só. */
  tokenGlobal?: string;
  /** A barbearia daquele token único. Sem ela, o token não vale. */
  tenantDoTokenGlobal?: string;
  /** JSON `{"1":"token-da-um","2":"token-da-dois"}`. */
  tokensPorTenant?: string;
}

export const MOTIVO_TOKEN_INVALIDO = 'Token do WhatsApp inválido.';
export const MOTIVO_GLOBAL_SEM_TENANT =
  'WHATSAPP_BOT_TOKEN definido sem WHATSAPP_BOT_TENANT_ID. ' +
  'Diga de qual barbearia é esse token, ou use WHATSAPP_BOT_TOKENS.';
export const MOTIVO_MAPA_INVALIDO = 'WHATSAPP_BOT_TOKENS inválido no backend.';

/** Erros de configuração e de credencial são coisas diferentes. */
export class ConfiguracaoDoBotInvalida extends Error {}
export class TokenDoBotInvalido extends Error {}

function mapaDeTokens(bruto?: string): Record<string, string> {
  if (!bruto || !bruto.trim()) return {};
  let lido: unknown;
  try {
    lido = JSON.parse(bruto);
  } catch {
    throw new ConfiguracaoDoBotInvalida(MOTIVO_MAPA_INVALIDO);
  }
  if (!lido || typeof lido !== 'object' || Array.isArray(lido)) {
    throw new ConfiguracaoDoBotInvalida(MOTIVO_MAPA_INVALIDO);
  }
  const mapa: Record<string, string> = {};
  for (const [tenant, token] of Object.entries(lido as Record<string, unknown>)) {
    if (typeof token === 'string' && token.trim()) mapa[String(tenant)] = token.trim();
  }
  return mapa;
}

/**
 * Devolve a barbearia que este token pode operar.
 *
 * O `tenantId` pedido serve só para conferência: se não bater com o do token,
 * é recusado. Nunca é ele que decide.
 */
export function tenantDoToken(
  token: unknown,
  tenantPedido: unknown,
  config: ConfigDoBot,
): number {
  const apresentado = String(token ?? '').trim();
  if (!apresentado) throw new TokenDoBotInvalido(MOTIVO_TOKEN_INVALIDO);

  const mapa = mapaDeTokens(config.tokensPorTenant);
  const global = String(config.tokenGlobal ?? '').trim();

  let tenantAutorizado: number | null = null;

  if (global && apresentado === global) {
    const declarado = Number(config.tenantDoTokenGlobal);
    // Falha fechada: token global sem barbearia declarada não vale nada. Era
    // exatamente essa combinação que abria todas as barbearias de uma vez.
    if (!Number.isInteger(declarado) || declarado < 1) {
      throw new ConfiguracaoDoBotInvalida(MOTIVO_GLOBAL_SEM_TENANT);
    }
    tenantAutorizado = declarado;
  } else {
    for (const [tenant, esperado] of Object.entries(mapa)) {
      if (apresentado === esperado) {
        tenantAutorizado = Number(tenant);
        break;
      }
    }
  }

  if (tenantAutorizado === null || !Number.isInteger(tenantAutorizado) || tenantAutorizado < 1) {
    throw new TokenDoBotInvalido(MOTIVO_TOKEN_INVALIDO);
  }

  // Pedir outra barbearia é recusado, e não silenciosamente redirecionado:
  // um fluxo apontando para o tenant errado precisa aparecer.
  const pedido = Number(tenantPedido);
  if (Number.isInteger(pedido) && pedido > 0 && pedido !== tenantAutorizado) {
    throw new TokenDoBotInvalido(MOTIVO_TOKEN_INVALIDO);
  }

  return tenantAutorizado;
}
