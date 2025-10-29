/**
 * Tipos Compartilhados - Barba Brutal SaaS
 * Centraliza todos os tipos usados na aplicação
 */

// ============================================
// AUTENTICAÇÃO
// ============================================

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  ativo: boolean;
  tenantId: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Tenant {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Admin {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AuthResponse {
  access_token: string;
  usuario?: Usuario;
  tenant?: Tenant;
  admin?: Admin;
}

export interface AuthState {
  user: Usuario | Tenant | Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  userType: 'usuario' | 'tenant' | 'admin' | null;
}

// ============================================
// AGENDAMENTOS
// ============================================

export interface Agendamento {
  id: number;
  clienteId: number;
  profissionalId: number;
  servicoId: number;
  dataHora: string;
  duracao: number; // em minutos
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  observacoes?: string;
  tenantId: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateAgendamentoDto {
  clienteId: number;
  profissionalId: number;
  servicoId: number;
  dataHora: string;
  observacoes?: string;
}

// ============================================
// CLIENTES
// ============================================

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  dataNascimento?: string;
  ativo: boolean;
  tenantId: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateClienteDto {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  dataNascimento?: string;
}

// ============================================
// PROFISSIONAIS
// ============================================

export interface Profissional {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  especialidade?: string;
  ativo: boolean;
  tenantId: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateProfissionalDto {
  nome: string;
  email: string;
  telefone: string;
  especialidade?: string;
}

// ============================================
// SERVIÇOS
// ============================================

export interface Servico {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracao: number; // em minutos
  ativo: boolean;
  tenantId: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateServicoDto {
  nome: string;
  descricao?: string;
  preco: number;
  duracao: number;
}

// ============================================
// ASSINATURA / PLANO
// ============================================

export interface Plano {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  maxUsuarios: number;
  maxAgendamentos: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Assinatura {
  id: number;
  tenantId: number;
  planoId: number;
  status: 'ativa' | 'cancelada' | 'expirada';
  dataInicio: string;
  dataFim: string;
  criadoEm: string;
  atualizadoEm: string;
}

// ============================================
// RESPOSTAS DE API
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// ERROS
// ============================================

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

// ============================================
// FILTROS E PAGINAÇÃO
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  [key: string]: any;
}

