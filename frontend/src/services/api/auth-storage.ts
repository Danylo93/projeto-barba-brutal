/**
 * Gerenciamento de Armazenamento de Autenticação
 * Centraliza a lógica de salvar/recuperar tokens
 */

import Cookies from 'js-cookie';

const TOKEN_KEY = 'barba-authorization';
const USER_TYPE_KEY = 'barba-user-type';

/**
 * Salvar token de autenticação
 */
export function setAuthToken(token: string, userType: 'usuario' | 'tenant' | 'admin') {
  if (typeof window !== 'undefined') {
    // Persistência principal (legado): localStorage
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_TYPE_KEY, userType);

    // Compatibilidade com ContextoSessao/useAPI: cookie
    const isDev = process.env.NODE_ENV === 'development';
    Cookies.set(TOKEN_KEY, token, {
      expires: 7, // dias; compatível com exp do JWT
      sameSite: isDev ? 'Lax' : 'None',
      secure: !isDev,
    });
  }
}

/**
 * Recuperar token de autenticação
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const fromLS = localStorage.getItem(TOKEN_KEY);
    if (fromLS) return fromLS;
    // Fallback: cookie (quando login foi feito via ContextoSessao)
    return Cookies.get(TOKEN_KEY) || null;
  }
  return null;
}

/**
 * Recuperar tipo de usuário
 */
export function getUserType(): 'usuario' | 'tenant' | 'admin' | null {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(USER_TYPE_KEY) as any) || null;
  }
  return null;
}

/**
 * Remover token de autenticação
 */
export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_TYPE_KEY);
    Cookies.remove(TOKEN_KEY);
  }
}

/**
 * Verificar se está autenticado
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

