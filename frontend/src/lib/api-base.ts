/**
 * Base das chamadas do client ao backend.
 *
 * Sempre usamos um proxy same-origin (`/api-backend`) que é reescrito no
 * next.config para o BACKEND_URL real. Assim o navegador nunca depende do
 * valor de NEXT_PUBLIC_URL_BASE (que pode vir vazio em produção) nem de CORS —
 * a requisição sai do mesmo domínio e a Vercel a encaminha para o backend.
 */
export const API_BASE = '/api-backend'
