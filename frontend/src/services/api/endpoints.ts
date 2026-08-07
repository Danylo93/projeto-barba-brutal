/**
 * Endpoints Centralizados
 * Define todas as URLs do backend NestJS em um único lugar.
 * O prefixo é relativo ao baseURL do apiClient (NEXT_PUBLIC_URL_BASE).
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN_USUARIO: '/auth/usuario/login',
    LOGIN_TENANT: '/auth/tenant/login',
    LOGIN_ADMIN: '/auth/admin/login',
    REGISTER_TENANT: '/auth/tenant/register',
    REGISTER_USUARIO: '/auth/usuario/register',
    PROFILE: '/auth/profile',
  },

  USUARIOS: {
    LIST: '/usuarios',
    GET: (id: number) => `/usuarios/${id}`,
    DELETE: (id: number) => `/usuarios/${id}`,
  },

  TENANTS: {
    LIST: '/tenants',
    GET: (id: number) => `/tenants/${id}`,
    ME: '/tenants/me',
    ME_STATS: '/tenants/me/stats',
    ME_CONFIGURACOES: '/tenants/me/configuracoes',
    ME_API_KEY: '/tenants/me/api-key',
    ME_COMISSOES: '/tenants/me/comissoes',
    ME_AGENDAMENTOS: '/tenants/me/agendamentos',
    PUBLICO: (identificador: string) => `/tenants/publico/${identificador}`,
    LIMITS: (id: number) => `/tenants/${id}/limits`,
    CREATE: '/tenants',
    UPDATE: (id: number) => `/tenants/${id}`,
    DELETE: (id: number) => `/tenants/${id}`,
  },

  AGENDAMENTOS: {
    CREATE: '/agendamentos',
    LISTAR_POR_EMAIL: (email: string) => `/agendamentos/${encodeURIComponent(email)}`,
    LISTAR_POR_TELEFONE: (telefone: string) => `/agendamentos/telefone/${telefone}`,
    OCUPACAO: (profissional: number, data: string) => `/agendamentos/ocupacao/${profissional}/${data}`,
    LISTAR_POR_PROFISSIONAL_DATA: (profissional: number, data: string) => `/agendamentos/${profissional}/${data}`,
    BARBEIRO_MEUS_HORARIOS: '/agendamentos/barbeiro/meus-horarios',
    DELETE: (id: number) => `/agendamentos/${id}`,
    ATUALIZAR_STATUS: (id: number) => `/agendamentos/${id}/status`,
    REAGENDAR: (id: number) => `/agendamentos/${id}/reagendar`,
  },

  PROFISSIONAIS: {
    LIST: '/profissionais',
    GET: (id: number) => `/profissionais/${id}`,
    CREATE: '/profissionais',
    UPDATE: (id: number) => `/profissionais/${id}`,
    DELETE: (id: number) => `/profissionais/${id}`,
  },

  SERVICOS: {
    LIST: '/servicos',
    GET: (id: number) => `/servicos/${id}`,
    CREATE: '/servicos',
    UPDATE: (id: number) => `/servicos/${id}`,
    DELETE: (id: number) => `/servicos/${id}`,
  },

  ASSINATURAS: {
    MINHA: '/assinaturas/me',
    CHANGE_PLAN: '/assinaturas/me/change-plan',
    CANCEL: '/assinaturas/me/cancel',
    RECORRENTE: '/assinaturas/me/recorrente',
    PIX: '/assinaturas/me/pix',
    PIX_DOMINIO: '/assinaturas/me/dominio/pix',
    CONSULTAR_PIX: (id: number) => `/assinaturas/me/pix/${id}`,
    PAGAMENTOS: '/assinaturas/pagamentos',
    CONFIRMAR_PAGAMENTO: (id: number) => `/assinaturas/pagamentos/${id}/confirmar`,
    WEBHOOK_MP: '/assinaturas/webhook/mercadopago',
    DIAGNOSTICO_MP: '/assinaturas/mercadopago/diagnostico',
    SINCRONIZAR_PLANOS: '/assinaturas/planos/sincronizar',
    GET: (tenantId: number) => `/assinaturas/${tenantId}`,
    CANCEL_TENANT: (tenantId: number) => `/assinaturas/${tenantId}/cancel`,
  },

  PLANOS: {
    LIST: '/planos',
    GET: (id: number) => `/planos/${id}`,
    CREATE: '/planos',
    UPDATE: (id: number) => `/planos/${id}`,
    DELETE: (id: number) => `/planos/${id}`,
  },

  BLOQUEIOS: {
    LIST: '/bloqueios',
    CREATE: '/bloqueios',
    DELETE: (id: number) => `/bloqueios/${id}`,
  },

  LGPD: {
    VERSAO: '/lgpd/versoes',
    CONSENTIMENTO: '/lgpd/consentimento',
    MEUS_CONSENTIMENTOS: '/lgpd/meus-consentimentos',
    MEUS_DADOS: '/lgpd/meus-dados',
    EXCLUIR_CONTA: '/lgpd/excluir-conta',
    SOLICITACOES_EXCLUSAO: '/lgpd/solicitacoes-exclusao',
    CONCLUIR_EXCLUSAO: (id: number) => `/lgpd/solicitacoes-exclusao/${id}/concluir`,
  },

  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    TENANTS: '/admin/tenants',
    TENANT: (id: number) => `/admin/tenants/${id}`,
    TENANT_STATUS: (id: number) => `/admin/tenants/${id}/status`,
    REVENUE: '/admin/revenue',
    TOP_TENANTS: '/admin/top-tenants',
  },

  LEMBRETES: {
    PROXIMOS: '/lembretes/proximos',
  },

  HEALTH: '/health',
}

