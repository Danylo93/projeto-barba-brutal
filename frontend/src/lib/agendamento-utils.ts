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

export function horariosDoDia() {
  const manha = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  ]
  const tarde = [
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
  ]
  const noite = [
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  ]
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
}

export interface Servico {
  id: number
  nome: string
  preco: number
  duracao: number
  qtdeSlots?: number
  imagemURL: string
  descricao?: string
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

