/**
 * Serviço de Agendamentos
 * Centraliza toda a lógica de requisições relacionadas a agendamentos
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  Agendamento,
  CreateAgendamentoDto,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
} from '@/types';

class AgendamentoService {
  /**
   * Listar agendamentos com filtros e paginação
   */
  async list(
    params?: PaginationParams & FilterParams
  ): Promise<PaginatedResponse<Agendamento>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Agendamento>>>(
      API_ENDPOINTS.AGENDAMENTOS.LIST,
      { params }
    );
    return response.data.data!;
  }

  /**
   * Obter agendamento por ID
   */
  async getById(id: number): Promise<Agendamento> {
    const response = await apiClient.get<ApiResponse<Agendamento>>(
      API_ENDPOINTS.AGENDAMENTOS.GET(id)
    );
    return response.data.data!;
  }

  /**
   * Criar novo agendamento
   */
  async create(data: CreateAgendamentoDto): Promise<Agendamento> {
    const response = await apiClient.post<ApiResponse<Agendamento>>(
      API_ENDPOINTS.AGENDAMENTOS.CREATE,
      data
    );
    return response.data.data!;
  }

  /**
   * Atualizar agendamento
   */
  async update(id: number, data: Partial<CreateAgendamentoDto>): Promise<Agendamento> {
    const response = await apiClient.put<ApiResponse<Agendamento>>(
      API_ENDPOINTS.AGENDAMENTOS.UPDATE(id),
      data
    );
    return response.data.data!;
  }

  /**
   * Deletar agendamento
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.AGENDAMENTOS.DELETE(id));
  }

  /**
   * Cancelar agendamento
   */
  async cancel(id: number, motivo?: string): Promise<Agendamento> {
    const response = await apiClient.post<ApiResponse<Agendamento>>(
      API_ENDPOINTS.AGENDAMENTOS.CANCEL(id),
      { motivo }
    );
    return response.data.data!;
  }

  /**
   * Confirmar agendamento
   */
  async confirm(id: number): Promise<Agendamento> {
    const response = await apiClient.post<ApiResponse<Agendamento>>(
      API_ENDPOINTS.AGENDAMENTOS.CONFIRM(id)
    );
    return response.data.data!;
  }

  /**
   * Obter agendamentos do dia
   */
  async getAgendamentosDoDia(data: string): Promise<Agendamento[]> {
    const response = await apiClient.get<ApiResponse<Agendamento[]>>(
      API_ENDPOINTS.AGENDAMENTOS.LIST,
      {
        params: {
          dataInicio: data,
          dataFim: data,
        },
      }
    );
    return response.data.data!;
  }

  /**
   * Obter agendamentos por cliente
   */
  async getAgendamentosCliente(clienteId: number): Promise<Agendamento[]> {
    const response = await apiClient.get<ApiResponse<Agendamento[]>>(
      API_ENDPOINTS.AGENDAMENTOS.LIST,
      {
        params: {
          clienteId,
        },
      }
    );
    return response.data.data!;
  }

  /**
   * Obter agendamentos por profissional
   */
  async getAgendamentosProfissional(profissionalId: number): Promise<Agendamento[]> {
    const response = await apiClient.get<ApiResponse<Agendamento[]>>(
      API_ENDPOINTS.AGENDAMENTOS.LIST,
      {
        params: {
          profissionalId,
        },
      }
    );
    return response.data.data!;
  }
}

export default new AgendamentoService();

