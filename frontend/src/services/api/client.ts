/**
 * Cliente HTTP Profissional
 * Configuração centralizada do Axios com interceptadores
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '@/types';
import { getAuthToken, removeAuthToken } from './auth-storage';

// Criar instância do Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_URL_BASE || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// INTERCEPTADOR DE REQUISIÇÃO
// ============================================

apiClient.interceptors.request.use(
  (config) => {
    // Adicionar token de autenticação
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Erro na requisição:', error);
    }
    return Promise.reject(error);
  }
);

// ============================================
// INTERCEPTADOR DE RESPOSTA
// ============================================

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    return response;
  },
  (error: AxiosError<ApiResponse<any>>) => {
    const apiError: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: 'Erro desconhecido',
      statusCode: error.response?.status || 500,
    };

    // Tratamento de erros específicos
    if (error.response) {
      const { status, data } = error.response;

      // Erro 401 - Não autenticado
      if (status === 401) {
        apiError.code = 'UNAUTHORIZED';
        apiError.message = 'Sessão expirada. Faça login novamente.';
        removeAuthToken();
        // Redirecionar para login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      // Erro 403 - Não autorizado
      if (status === 403) {
        apiError.code = 'FORBIDDEN';
        apiError.message = 'Você não tem permissão para acessar este recurso.';
      }

      // Erro 404 - Não encontrado
      if (status === 404) {
        apiError.code = 'NOT_FOUND';
        apiError.message = 'Recurso não encontrado.';
      }

      // Erro 422 - Validação
      if (status === 422) {
        apiError.code = 'VALIDATION_ERROR';
        apiError.message = 'Dados inválidos. Verifique os campos.';
        apiError.details = data.error?.details;
      }

      // Erro 429 - Rate limit
      if (status === 429) {
        apiError.code = 'RATE_LIMIT';
        apiError.message = 'Muitas requisições. Tente novamente mais tarde.';
      }

      // Erro 500+ - Servidor
      if (status >= 500) {
        apiError.code = 'SERVER_ERROR';
        apiError.message = 'Erro no servidor. Tente novamente mais tarde.';
      }

      // Usar mensagem do servidor se disponível
      if (data?.error?.message) {
        apiError.message = data.error.message;
      }
    } else if (error.request) {
      // Erro de rede
      apiError.code = 'NETWORK_ERROR';
      apiError.message = 'Erro de conexão. Verifique sua internet.';
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Erro:', apiError);
    }
    return Promise.reject(apiError);
  }
);

export default apiClient;

