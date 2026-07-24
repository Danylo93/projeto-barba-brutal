// Utilitários para agendamento (substituição de @barba/core)

export function formatarDataEHora(data: Date): string {
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function hoje(): Date {
  return new Date()
}

export function aplicarHorario(data: Date, horario: string): Date {
  const novaData = new Date(data)
  const [hora, minuto] = horario.split(':').map(Number)
  novaData.setHours(hora || 0)
  novaData.setMinutes(minuto || 0)
  novaData.setSeconds(0)
  novaData.setMilliseconds(0)
  return novaData
}

export const HORA_ABERTURA_PADRAO = '08:00'
export const HORA_FECHAMENTO_PADRAO = '21:00'
export const DIAS_ABERTOS_PADRAO = [1, 2, 3, 4, 5, 6]

export interface DiaHorario {
  dia: number // 0=domingo ... 6=sábado
  aberto: boolean
  abertura: string
  fechamento: string
}

/**
 * Resolve o horário de um dia da semana (0-6) a partir das configurações,
 * aceitando tanto o formato NOVO (`horarios[]`, com horário por dia) quanto o
 * ANTIGO (`diasAbertos` + `horaAbertura`/`horaFechamento` únicos).
 */
export function horarioDoDia(configuracoes: any, dia: number): DiaHorario {
  const horarios = configuracoes?.horarios
  if (Array.isArray(horarios)) {
    const h = horarios.find((x: any) => Number(x?.dia) === dia)
    return {
      dia,
      aberto: !!h?.aberto,
      abertura: h?.abertura || HORA_ABERTURA_PADRAO,
      fechamento: h?.fechamento || HORA_FECHAMENTO_PADRAO,
    }
  }
  // Formato antigo: um único horário para todos os dias abertos.
  const diasAbertos = configuracoes?.diasAbertos || configuracoes?.diasFuncionamento || DIAS_ABERTOS_PADRAO
  return {
    dia,
    aberto: diasAbertos.includes(dia),
    abertura: configuracoes?.horaAbertura || configuracoes?.horarioAbertura || HORA_ABERTURA_PADRAO,
    fechamento: configuracoes?.horaFechamento || configuracoes?.horarioFechamento || HORA_FECHAMENTO_PADRAO,
  }
}

/** Lista de dias (0-6) em que a barbearia está aberta, nos dois formatos. */
export function diasAbertosDaConfig(configuracoes: any): number[] {
  const horarios = configuracoes?.horarios
  if (Array.isArray(horarios)) {
    return horarios.filter((h: any) => h?.aberto).map((h: any) => Number(h.dia))
  }
  return configuracoes?.diasAbertos || configuracoes?.diasFuncionamento || DIAS_ABERTOS_PADRAO
}

/**
 * Gera os horários disponíveis (manhã/tarde/noite) de slots de 30 min.
 * Quando `referencia` (Data ou dia da semana 0-6) é informada, usa o horário
 * específico daquele dia; se o dia estiver fechado, devolve listas vazias.
 * Sem `referencia`, mantém o comportamento antigo (horário único).
 */
export function horariosDoDia(configuracoes?: any, referencia?: Date | number) {
  let abertura = configuracoes?.horaAbertura || configuracoes?.horarioAbertura || HORA_ABERTURA_PADRAO
  let fechamento = configuracoes?.horaFechamento || configuracoes?.horarioFechamento || HORA_FECHAMENTO_PADRAO

  if (referencia !== undefined && referencia !== null) {
    const dia = referencia instanceof Date ? referencia.getDay() : Number(referencia)
    const h = horarioDoDia(configuracoes, dia)
    if (!h.aberto) return { manha: [], tarde: [], noite: [] }
    abertura = h.abertura
    fechamento = h.fechamento
  }

  const [horaAbertura, minAbertura] = abertura.split(':').map(Number)
  const [horaFechamento, minFechamento] = fechamento.split(':').map(Number)

  const horarios = []
  let horaAtual = horaAbertura
  let minAtual = minAbertura

  while (horaAtual < horaFechamento || (horaAtual === horaFechamento && minAtual <= minFechamento)) {
    horarios.push(`${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`)
    minAtual += 30
    if (minAtual >= 60) {
      minAtual -= 60
      horaAtual += 1
    }
  }

  const manha = horarios.filter((h) => parseInt(h.split(':')[0]) < 12)
  const tarde = horarios.filter((h) => parseInt(h.split(':')[0]) >= 12 && parseInt(h.split(':')[0]) < 18)
  const noite = horarios.filter((h) => parseInt(h.split(':')[0]) >= 18)

  return { manha, tarde, noite }
}

export function duracaoTotal(servicos: Array<{ duracao: number }>): string {
  const totalMinutos = servicos.reduce((acc, servico) => acc + servico.duracao, 0)
  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60
  return `${horas}h${minutos}min`
}

export interface Agendamento {
  id: number
  data: string
  status?: string
  usuario: { nome: string }
  servicos: Array<{ id: number; nome: string; preco: number; duracao: number; qtdeSlots?: number }>
  profissionalId: number
}

export interface Profissional {
  id: number
  nome: string
  imagemUrl: string
  descricao?: string
  avaliacao?: number
  quantidadeAvaliacoes?: number
  servicos?: { id: number; nome?: string }[]
}

export interface Servico {
  id: number
  nome: string
  preco: number
  duracao: number
  qtdeSlots?: number
  imagemURL: string
  descricao?: string
  ehCombo?: boolean
}

/**
 * Resolve a imagem de um serviço para um arquivo local em /public/servicos.
 * Dados antigos vêm com URLs placeholder (example.com) que não carregam,
 * então mapeamos pelo nome. URLs reais já cadastradas são mantidas.
 */
export function imagemDoServico(nome?: string, imagemURL?: string): string {
  if (imagemURL && !imagemURL.includes('example.com')) return imagemURL
  const n = (nome ?? '').toLowerCase()
  if (n.includes('combo')) return '/servicos/combo.jpg'
  if (n.includes('barba')) return '/servicos/corte-de-barba.jpg'
  if (n.includes('infant')) return '/servicos/corte-infantil.jpg'
  if (n.includes('noiv')) return '/servicos/dia-de-noivo.jpg'
  if (n.includes('manicure') || n.includes('pedicure') || n.includes('unha'))
    return '/servicos/manicure-pedicure.jpg'
  if (n.includes('cabelo') || n.includes('corte')) return '/servicos/corte-de-cabelo.jpg'
  return '/servicos/corte-de-cabelo.jpg'
}

/**
 * Resolve a imagem de um profissional para uma das fotos locais
 * em /public/profissionais (distribuídas de forma estável pelo id).
 */
export function imagemDoProfissional(id?: number, imagemUrl?: string): string {
  if (imagemUrl && !imagemUrl.includes('example.com')) return imagemUrl
  const idx = ((((id ?? 1) - 1) % 6) + 6) % 6 + 1
  return `/profissionais/profissional-${idx}.jpg`
}

export interface Usuario {
  id: number
  nome: string
  email: string
  telefone?: string
  barbeiro?: boolean
  tenantId: number
  tipo?: 'tenant' | 'usuario' | 'admin'
}

// Telefone Utilities
export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '')
  if (numeros.length === 11) {
    return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  if (numeros.length === 10) {
    return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }
  return telefone
}

export function formatarTelefoneInput(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '')
  if (numeros.length <= 11) {
    return numeros
  }
  return telefone
}

/** Valida formato de e-mail. */
export function validarEmail(email: string): string | null {
  if (!email || !email.trim()) return 'Informe o e-mail'
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!regex.test(email.trim())) return 'E-mail inválido. Informe um e-mail válido (ex: nome@email.com)'
  return null
}

/**
 * Valida telefone brasileiro (WhatsApp).
 * Aceita DDD (2 dígitos) + número (8 ou 9 dígitos) = 10 ou 11 dígitos.
 */
export function validarTelefone(telefone: string): string | null {
  if (!telefone || !telefone.trim()) return 'Informe o telefone'
  const numeros = telefone.replace(/\D/g, '')
  if (numeros.length < 10 || numeros.length > 11) {
    return 'Telefone inválido. Informe DDD + número (ex: 11 99999-0000)'
  }
  return null
}


// Data Utilities - export as object for compatibility
export const DataUtils = {
  hoje,
  aplicarHorario,
  formatarDataEHora,
}

// Agenda Utilities - export as object for compatibility
export const AgendaUtils = {
  duracaoTotal,
  horariosDoDia,
}

// Mock data exports
export interface ClienteLanding {
  id: number
  nome: string
  testemunho: string
  imagemURL: string
}
export const clientes: ClienteLanding[] = []

