import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  Agendamento,
  CreateAgendamentoDto,
} from '@/types';

class AgendamentoService {
  async list(params?: any): Promise<any> {
    const response = await apiClient.get(
      API_ENDPOINTS.AGENDAMENTOS.BARBEIRO_MEUS_HORARIOS,
      { params }
    );
    return { data: response.data };
  }

  async create(data: CreateAgendamentoDto): Promise<Agendamento> {
    const response = await apiClient.post(
      API_ENDPOINTS.AGENDAMENTOS.CREATE,
      data
    );
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.AGENDAMENTOS.DELETE(id));
  }

  async atualizarStatus(id: number, status: string): Promise<any> {
    const response = await apiClient.patch(
      API_ENDPOINTS.AGENDAMENTOS.ATUALIZAR_STATUS(id),
      { status }
    );
    return response.data;
  }

  async reagendar(id: number, data: string): Promise<void> {
    await apiClient.patch(
      API_ENDPOINTS.AGENDAMENTOS.REAGENDAR(id),
      { data }
    );
  }
}

const agendamentoService = new AgendamentoService();
export default agendamentoService;
