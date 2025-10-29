/**
 * Hook Profissional para Agendamentos
 * Exemplo de como usar os serviços de API
 */

import { useState, useCallback, useEffect } from 'react';
import agendamentoService from '@/services/api/agendamento.service';
import { Agendamento, CreateAgendamentoDto, ApiError } from '@/types';

interface UseAgendamentosState {
  agendamentos: Agendamento[];
  loading: boolean;
  error: ApiError | null;
}

export function useAgendamentos() {
  const [state, setState] = useState<UseAgendamentosState>({
    agendamentos: [],
    loading: false,
    error: null,
  });

  /**
   * Listar agendamentos
   */
  const listar = useCallback(async (params?: any) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await agendamentoService.list(params);
      setState((prev) => ({ ...prev, agendamentos: data.data, loading: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  /**
   * Obter agendamento por ID
   */
  const obter = useCallback(async (id: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await agendamentoService.getById(id);
      return data;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  /**
   * Criar agendamento
   */
  const criar = useCallback(async (data: CreateAgendamentoDto) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const novoAgendamento = await agendamentoService.create(data);
      setState((prev) => ({
        ...prev,
        agendamentos: [...prev.agendamentos, novoAgendamento],
        loading: false,
      }));
      return novoAgendamento;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  /**
   * Atualizar agendamento
   */
  const atualizar = useCallback(async (id: number, data: Partial<CreateAgendamentoDto>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const agendamentoAtualizado = await agendamentoService.update(id, data);
      setState((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.map((a) =>
          a.id === id ? agendamentoAtualizado : a
        ),
        loading: false,
      }));
      return agendamentoAtualizado;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  /**
   * Deletar agendamento
   */
  const deletar = useCallback(async (id: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await agendamentoService.delete(id);
      setState((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.filter((a) => a.id !== id),
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  /**
   * Cancelar agendamento
   */
  const cancelar = useCallback(async (id: number, motivo?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const agendamentoCancelado = await agendamentoService.cancel(id, motivo);
      setState((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.map((a) =>
          a.id === id ? agendamentoCancelado : a
        ),
        loading: false,
      }));
      return agendamentoCancelado;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  /**
   * Confirmar agendamento
   */
  const confirmar = useCallback(async (id: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const agendamentoConfirmado = await agendamentoService.confirm(id);
      setState((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.map((a) =>
          a.id === id ? agendamentoConfirmado : a
        ),
        loading: false,
      }));
      return agendamentoConfirmado;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  return {
    ...state,
    listar,
    obter,
    criar,
    atualizar,
    deletar,
    cancelar,
    confirmar,
  };
}

