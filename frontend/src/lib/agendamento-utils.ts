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

export function horariosDoDia(configuracoes?: any) {
  const abertura = configuracoes?.horaAbertura || '08:00'
  const fechamento = configuracoes?.horaFechamento || '21:00'

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

