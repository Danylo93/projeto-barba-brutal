/**
 * As contas por trás do agendamento na página pública da barbearia.
 *
 * Fora do componente porque é aqui que mora o erro que ninguém vê na tela:
 * horário oferecido que não cabe antes de fechar, horário de hoje que já
 * passou, e — o clássico deste projeto — hora montada no fuso do NAVEGADOR
 * em vez do de Brasília.
 */

export const MINUTOS_POR_SLOT = 30

export function brl(valor: number): string {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function duracao(qtdeSlots: number): string {
  const min = Math.max(1, qtdeSlots ?? 1) * MINUTOS_POR_SLOT
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? min % 60 : ''}` : `${min} min`
}

/** Hoje no fuso de Brasília — o mínimo do seletor de data. */
export function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * "2026-08-15" + "15:00" no instante certo.
 *
 * O `-03:00` é explícito porque `new Date('2026-08-15T15:00')` usa o fuso do
 * NAVEGADOR: um cliente viajando marcaria 15h no fuso dele e apareceria na
 * barbearia em outro horário.
 */
export function instanteBrasilia(dia: string, hora: string): string {
  return new Date(`${dia}T${hora}:00-03:00`).toISOString()
}

export function mascaraTelefone(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Os horários que a pessoa pode escolher.
 *
 * Um horário só entra se TODOS os slots que o atendimento ocupa estiverem
 * livres e couberem antes de fechar — senão a tela oferece 19h30 para um
 * combo de uma hora numa barbearia que fecha às 20h.
 */
export function montarHorarios(
  grade: { aberto: boolean; abre?: string; fecha?: string }[],
  dia: string,
  slots: number,
  ocupados: string[],
): string[] {
  if (!dia) return []

  const config = grade[diaSemanaEmBrasilia(dia)]
  if (!config?.aberto || !config.abre || !config.fecha) return []

  const abre = emMinutos(config.abre)
  const fecha = emMinutos(config.fecha)
  const duracaoMin = slots * MINUTOS_POR_SLOT

  // Hoje, só o que ainda não passou. Sem isto a tela oferece 9h às 15h.
  const minutosAgora = dia === hojeEmBrasilia() ? agoraEmMinutos() : -1

  const livres: string[] = []
  for (let inicio = abre; inicio + duracaoMin <= fecha; inicio += MINUTOS_POR_SLOT) {
    if (inicio <= minutosAgora) continue

    const todosLivres = Array.from({ length: slots }, (_, i) =>
      formatar(inicio + i * MINUTOS_POR_SLOT),
    ).every((h) => !ocupados.includes(h))

    if (todosLivres) livres.push(formatar(inicio))
  }
  return livres
}

/** Dia da semana (0-6) do dia civil, lido em Brasília. */
export function diaSemanaEmBrasilia(dia: string): number {
  const meioDia = new Date(`${dia}T12:00:00-03:00`)
  const sigla = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  }).format(meioDia)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(sigla)
}

/** "15:30" → 930. */
export function emMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Que horas são agora em Brasília, em minutos desde a meia-noite. */
export function agoraEmMinutos(): number {
  const agora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
  return emMinutos(agora)
}

export function formatar(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
