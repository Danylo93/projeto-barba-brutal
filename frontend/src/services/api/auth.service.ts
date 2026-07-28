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
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN_USUARIO,
      { email, senha, tenantId }
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
  }

  async getCurrentUser(): Promise<Usuario | Tenant> {
    const response = await apiClient.get<Usuario | Tenant>(
      API_ENDPOINTS.AUTH.PROFILE
    );
    return response.data;
  }

  async refreshToken(): Promise<string> {
    throw new Error('Refresh token não implementado no backend');
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

const authService = new AuthService();
export default authService;
