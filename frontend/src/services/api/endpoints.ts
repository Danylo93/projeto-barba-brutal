/**
 * Endpoints Centralizados
 * Define todas as URLs da API em um único lugar
 */

export const API_ENDPOINTS = {
  // ============================================
  // AUTENTICAÇÃO
  // ============================================
  AUTH: {
    LOGIN_USUARIO: '/api/auth/usuario/login',
    LOGIN_TENANT: '/api/auth/tenant/login',
    LOGIN_ADMIN: '/api/auth/admin/login',
    REGISTER_TENANT: '/api/auth/tenant/register',
    LOGOUT: '/api/auth/logout',
    REFRESH_TOKEN: '/api/auth/refresh',
    ME: '/api/auth/me',
  },

  // ============================================
  // USUÁRIOS
  // ============================================
  USUARIOS: {
    LIST: '/usuario',
    GET: (id: number) => `/usuario/${id}`,
    CREATE: '/usuario',
    UPDATE: (id: number) => `/usuario/${id}`,
    DELETE: (id: number) => `/usuario/${id}`,
  },

  // ============================================
  // TENANTS
  // ============================================
  TENANTS: {
    LIST: '/tenant',
    GET: (id: number) => `/tenant/${id}`,
    CREATE: '/tenant',
    UPDATE: (id: number) => `/tenant/${id}`,
    DELETE: (id: number) => `/tenant/${id}`,
  },

  // ============================================
  // AGENDAMENTOS
  // ============================================
  AGENDAMENTOS: {
    LIST: '/agendamentos',
    GET: (id: number) => `/agendamentos/${id}`,
    CREATE: '/agendamentos',
    UPDATE: (id: number) => `/agendamentos/${id}`,
    DELETE: (id: number) => `/agendamentos/${id}`,
    CANCEL: (id: number) => `/agendamentos/${id}/cancelar`,
    CONFIRM: (id: number) => `/agendamentos/${id}/confirmar`,
  },

  // ============================================
  // CLIENTES
  // ============================================
  CLIENTES: {
    LIST: '/clientes',
    GET: (id: number) => `/clientes/${id}`,
    CREATE: '/clientes',
    UPDATE: (id: number) => `/clientes/${id}`,
    DELETE: (id: number) => `/clientes/${id}`,
  },

  // ============================================
  // PROFISSIONAIS
  // ============================================
  PROFISSIONAIS: {
    LIST: '/profissionais',
    GET: (id: number) => `/profissionais/${id}`,
    CREATE: '/profissionais',
    UPDATE: (id: number) => `/profissionais/${id}`,
    DELETE: (id: number) => `/profissionais/${id}`,
  },

  // ============================================
  // SERVIÇOS
  // ============================================
  SERVICOS: {
    LIST: '/servicos',
    GET: (id: number) => `/servicos/${id}`,
    CREATE: '/servicos',
    UPDATE: (id: number) => `/servicos/${id}`,
    DELETE: (id: number) => `/servicos/${id}`,
  },

  // ============================================
  // ASSINATURA
  // ============================================
  ASSINATURA: {
    GET: '/assinatura',
    UPDATE: '/assinatura',
    CANCEL: '/assinatura/cancelar',
  },

  // ============================================
  // PLANOS
  // ============================================
  PLANOS: {
    LIST: '/planos',
    GET: (id: number) => `/planos/${id}`,
  },
};

