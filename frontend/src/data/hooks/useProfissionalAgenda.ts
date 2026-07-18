import { Agendamento } from '@/lib/agendamento-utils'
import { useCallback, useEffect, useState } from 'react'
import useUsuario from './useUsuario'
import useAPI from './useAPI'
import { useToast } from '@/hooks/use-toast'

export default function useProfissionalAgenda() {
    const { usuario } = useUsuario()
    const { httpGet, httpDelete, httpPatch } = useAPI()
    const { success, error: toastError } = useToast()
    const [data, setData] = useState<Date>(new Date())
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

    const carregarAgendamentos = useCallback(async () => {
        if (!usuario) return
        const dtString = data.toISOString().slice(0, 10)
        const resposta = await httpGet(`agendamentos/${usuario.id}/${dtString}`)
        setAgendamentos(Array.isArray(resposta) ? resposta : [])
    }, [httpGet, usuario, data])

    useEffect(() => {
        carregarAgendamentos()
    }, [carregarAgendamentos])

    async function excluirAgendamento(id: number) {
        try {
            await httpDelete(`agendamentos/${id}`)
            setAgendamentos(agendamentos.filter((a) => a.id !== id))
            success('Agendamento excluído', 'O agendamento foi cancelado com sucesso.')
        } catch (err) {
            toastError('Erro ao cancelar', err instanceof Error ? err.message : 'Erro ao cancelar o agendamento')
        }
    }

    async function atualizarStatus(id: number, status: string) {
        try {
            await httpPatch(`agendamentos/${id}/status`, { status })
            setAgendamentos(agendamentos.map((a) => a.id === id ? { ...a, status } : a))
            success('Status atualizado', `Agendamento marcado como ${status}.`)
        } catch (err) {
            toastError('Erro ao atualizar', err instanceof Error ? err.message : 'Erro ao atualizar o status')
        }
    }

    return {
        data,
        agendamentos,
        alterarData: setData,
        excluirAgendamento,
        atualizarStatus,
    }
}
