/**
 * Janela de lembrete — função pura, sem Nest nem Prisma.
 *
 * O fluxo antigo consultava `data >= agora+60min AND data < agora+65min` a
 * cada 5 minutos. Uma janela que não perdoa: bastava UMA execução do n8n
 * falhar (Redis fora, Postgres lento, deploy no meio, o Render dormindo) para
 * aqueles agendamentos nunca mais serem consultados. Ninguém era lembrado, e
 * não sobrava erro em lugar nenhum.
 *
 * Aqui a janela vai de AGORA até `agora + minutosAntes + janela`, e o que
 * separa quem já foi de quem falta é a marca no banco, não o relógio. Lembrete
 * atrasado é ruim; lembrete nenhum é pior.
 */

/**
 * Quem acabou de marcar não precisa de lembrete: sem isto, quem agenda para
 * daqui a 40 minutos recebia o "lembrete" um minuto depois de agendar.
 */
export const MINUTOS_DE_CARENCIA = 15;

export interface JanelaDeLembrete {
  /** Só agendamentos que ainda não começaram. */
  de: Date;
  /** Até o horizonte do lembrete (ex.: daqui a 65 min). */
  ate: Date;
  /** Agendamentos criados depois disto são novos demais para lembrar. */
  criadoAte: Date;
}

export function calcularJanela(
  minutosAntes: number,
  janelaMin: number,
  agora: Date = new Date(),
): JanelaDeLembrete {
  const antes = Number.isFinite(minutosAntes) ? Math.max(0, minutosAntes) : 60;
  const janela = Number.isFinite(janelaMin) ? Math.max(1, janelaMin) : 5;

  return {
    de: agora,
    ate: new Date(agora.getTime() + (antes + janela) * 60_000),
    criadoAte: new Date(agora.getTime() - MINUTOS_DE_CARENCIA * 60_000),
  };
}

/**
 * Até quando um agendamento recém-criado ainda merece confirmação.
 *
 * O fluxo antigo olhava `createdAt >= now() - 1 hora`: n8n parado por mais de
 * uma hora e aqueles clientes nunca recebiam a confirmação. Seis horas dão
 * folga real para uma queda, sem chegar ao ponto de mandar "agendamento
 * confirmado!" no dia seguinte.
 */
export const HORAS_PARA_CONFIRMAR = 6;

export interface JanelaDeConfirmacao {
  /** Agendamentos criados antes disto são velhos demais para confirmar. */
  criadoDe: Date;
  /** Só confirma o que ainda não aconteceu. */
  aPartirDe: Date;
}

export function calcularJanelaDeConfirmacao(
  agora: Date = new Date(),
): JanelaDeConfirmacao {
  return {
    criadoDe: new Date(agora.getTime() - HORAS_PARA_CONFIRMAR * 3_600_000),
    aPartirDe: agora,
  };
}

/** Telefone que a Evolution consegue entregar (BR, com DDD). */
export function telefoneUtilizavel(telefone?: string | null): boolean {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return false;
  return digitos.startsWith('55') ? digitos.length >= 12 : true;
}
