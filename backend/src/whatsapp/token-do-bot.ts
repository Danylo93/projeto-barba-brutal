/**
 * Quem o token do bot de WhatsApp autoriza — e em qual barbearia.
 *
 * A regra do projeto é que o tenant nunca vem da query string. Aqui ela estava
 * furada: o `WHATSAPP_BOT_TOKEN` era aceito com QUALQUER `?tenantId=`. Quem
 * tivesse esse token trocava o número na URL e lia a agenda, os telefones dos
 * clientes, criava e cancelava agendamento de qualquer barbearia.
 *
 * A correção NÃO pode ser uma variável de ambiente por barbearia: isso pediria
 * um deploy a cada cliente novo, o que num SaaS é o mesmo que não funcionar.
 *
 * Quem identifica a barbearia é a **instância da Evolution** — que já é única
 * por barbearia, validada no cadastro, e chega no fluxo pelo webhook da
 * própria Evolution, não por digitação de ninguém. O token só prova "este é o
 * nosso n8n"; a instância diz de quem é a conversa.
 */

export interface ConfigDoBot {
  /** Token do n8n do SaaS. Sozinho não escolhe barbearia — a instância escolhe. */
  tokenGlobal?: string;
  /** JSON `{"1":"token-da-um","2":"token-da-dois"}`, quando se quer um por barbearia. */
  tokensPorTenant?: string;
}

/** O token bastou para saber a barbearia, ou ainda falta a instância? */
export type QuemEsteTokenAutoriza =
  | { tipo: 'barbearia'; tenantId: number }
  | { tipo: 'precisa-da-instancia' };

export const MOTIVO_TOKEN_INVALIDO = 'Token do WhatsApp inválido.';
export const MOTIVO_SEM_INSTANCIA =
  'Informe a instance da Evolution: é ela que identifica a barbearia.';
export const MOTIVO_MAPA_INVALIDO = 'WHATSAPP_BOT_TOKENS inválido no backend.';
export const MOTIVO_SEM_CONFIGURACAO =
  'Bot de WhatsApp não configurado (defina WHATSAPP_BOT_TOKEN ou WHATSAPP_BOT_TOKENS).';

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
    const id = Number(tenant);
    if (typeof token === 'string' && token.trim() && Number.isInteger(id) && id > 0) {
      mapa[String(id)] = token.trim();
    }
  }
  return mapa;
}

/**
 * O que este token autoriza.
 *
 * Token por barbearia resolve sozinho. O token do SaaS não escolhe nada — quem
 * escolhe é a instância, e é o chamador que resolve isso no banco.
 */
export function quemEsteTokenAutoriza(
  token: unknown,
  config: ConfigDoBot,
): QuemEsteTokenAutoriza {
  const apresentado = String(token ?? '').trim();
  if (!apresentado) throw new TokenDoBotInvalido(MOTIVO_TOKEN_INVALIDO);

  const mapa = mapaDeTokens(config.tokensPorTenant);
  const global = String(config.tokenGlobal ?? '').trim();

  if (!global && Object.keys(mapa).length === 0) {
    throw new ConfiguracaoDoBotInvalida(MOTIVO_SEM_CONFIGURACAO);
  }

  for (const [tenant, esperado] of Object.entries(mapa)) {
    if (apresentado === esperado) {
      return { tipo: 'barbearia', tenantId: Number(tenant) };
    }
  }

  if (global && apresentado === global) return { tipo: 'precisa-da-instancia' };

  throw new TokenDoBotInvalido(MOTIVO_TOKEN_INVALIDO);
}

/**
 * Confere o `tenantId` que veio na URL contra o que o token e a instância
 * resolveram.
 *
 * Ele nunca decide — só é conferido. Divergência é recusada em vez de
 * silenciosamente redirecionada: fluxo apontado para a barbearia errada
 * precisa aparecer, e não atender a barbearia errada.
 */
export function conferirTenantPedido(
  tenantResolvido: number,
  tenantPedido: unknown,
): number {
  const pedido = Number(tenantPedido);
  if (Number.isInteger(pedido) && pedido > 0 && pedido !== tenantResolvido) {
    throw new TokenDoBotInvalido(MOTIVO_TOKEN_INVALIDO);
  }
  return tenantResolvido;
}
