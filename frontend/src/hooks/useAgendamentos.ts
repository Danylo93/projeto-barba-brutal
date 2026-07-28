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

  const listar = useCallback(async (params?: any) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await agendamentoService.list(params);
      setState((prev) => ({ ...prev, agendamentos: data.data, loading: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

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

  const atualizarStatus = useCallback(async (id: number, status: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const atualizado = await agendamentoService.atualizarStatus(id, status);
      setState((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.map((a) =>
          a.id === id ? { ...a, ...atualizado } : a
        ),
        loading: false,
      }));
      return atualizado;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  const reagendar = useCallback(async (id: number, data: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await agendamentoService.reagendar(id, data);
      setState((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.map((a) =>
          a.id === id ? { ...a, data } : a
        ),
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as ApiError, loading: false }));
    }
  }, []);

  return {
    ...state,
    listar,
    criar,
    deletar,
    atualizarStatus,
    reagendar,
  };
}

