/**
 * Serviço de Autenticação
 * Centraliza toda a lógica de autenticação
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import { setAuthToken, removeAuthToken } from './auth-storage';
import { AuthResponse, Usuario, Tenant } from '@/types';
import subscriptionService from './subscription.service';

class AuthService {
  /**
   * Login de usuário (funcionário)
   */
  async loginUsuario(email: string, senha: string, tenantId: number): Promise<AuthResponse> {
    const url = API_ENDPOINTS.AUTH.LOGIN_USUARIO;
    const config = url.startsWith('/api/') ? { baseURL: '' } : undefined;

    const response = await apiClient.post<AuthResponse>(
      url,
      { email, senha, tenantId },
      config
    );

    const data = response.data;
    if (data.access_token) {
      setAuthToken(data.access_token, 'usuario');
    }

    return data;
  }

  /**
   * Login de tenant (proprietário)
   */
  async loginTenant(email: string, senha: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN_TENANT,
      { email, senha }
    );

    const data = response.data;
    if (data.access_token) {
      setAuthToken(data.access_token, 'tenant');
    }

    return data;
  }

  /**
   * Login de admin
   */
  async loginAdmin(email: string, senha: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN_ADMIN,
      { email, senha }
    );

    const data = response.data;
    if (data.access_token) {
      setAuthToken(data.access_token, 'admin');
    }

    return data;
  }

  /**
   * Registrar novo tenant
   */
  async registerTenant(data: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER_TENANT,
      data
    );

    const responseData = response.data;
    if (responseData.access_token) {
      setAuthToken(responseData.access_token, 'tenant');
    }

    return responseData;
  }

  /**
   * Logout
   */
  logout(): void {
    removeAuthToken();
    // Opcional: chamar endpoint de logout no backend
    apiClient.post(API_ENDPOINTS.AUTH.LOGOUT).catch(() => {
      // Ignorar erros de logout
    });
  }

  /**
   * Obter dados do usuário atual
   */
  async getCurrentUser(): Promise<Usuario | Tenant> {
    const response = await apiClient.get<{ data: Usuario | Tenant }>(
      API_ENDPOINTS.AUTH.ME
    );
    return response.data.data;
  }

  /**
   * Renovar token
   */
  async refreshToken(): Promise<string> {
    const response = await apiClient.post<{ access_token: string }>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN
    );
    const token = response.data.access_token;
    if (token) {
      setAuthToken(token, 'usuario'); // Tipo padrão, deveria ser recuperado
    }
    return token;
  }

  /**
   * Verifica se um erro é relacionado a assinatura
   */
  isSubscriptionError(error: any): boolean {
    return subscriptionService.isSubscriptionError(error);
  }

  /**
   * Extrai informações de erro de assinatura
   */
  parseSubscriptionError(error: any) {
    return subscriptionService.parseSubscriptionError(error);
  }
}

export default new AuthService();

