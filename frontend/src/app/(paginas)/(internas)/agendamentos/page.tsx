'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Plus, Trash2, RotateCw } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { Skeleton } from '@/components/ui/skeleton'
import useUsuario from '@/data/hooks/useUsuario'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useToast } from '@/hooks/use-toast'

interface AgendamentoUI {
  id: number
  data: string
  profissional?: { nome: string }
  servicos: Array<{ nome: string; preco: number }>
  usuario?: { nome: string; email?: string }
  status?: string
}

export default function AgendamentosPage() {
  const router = useRouter()
  const { usuario } = useUsuario()
  const { httpGet, httpDelete } = useAPI()
  const { success, error: toastError } = useToast()
  
  const [agendamentos, setAgendamentos] = useState<AgendamentoUI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [confirmarExclusao, setConfirmarExclusao] = useState<number | null>(null)
  const [confirmarRemarcar, setConfirmarRemarcar] = useState<number | null>(null)

  const isTenant = usuario?.tipo === 'tenant'
  const isBarbeiro = !!usuario?.barbeiro
  const isEmployeeBarber = isBarbeiro && !isTenant

  const carregar = useCallback(async () => {
    if (!usuario) return
    try {
      setLoading(true)
      let uri = `agendamentos/${encodeURIComponent(usuario.email)}`
      if (isTenant) {
        uri = '/tenants/me/agendamentos'
      } else if (isEmployeeBarber) {
        uri = 'agendamentos/barbeiro/meus-horarios'
      }
      const resposta = await httpGet(uri)
      setAgendamentos(Array.isArray(resposta) ? resposta : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos')
      setAgendamentos([])
    } finally {
      setLoading(false)
    }
  }, [httpGet, usuario, isTenant, isEmployeeBarber])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleDelete = async () => {
    if (confirmarExclusao === null) return
    const id = confirmarExclusao
    try {
      await httpDelete(`agendamentos/${id}`)
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
      success('Agendamento excluído', 'O agendamento foi deletado com sucesso.')
    } catch (err) {
      toastError('Erro ao excluir', err instanceof Error ? err.message : 'Erro ao deletar')
    } finally {
      setConfirmarExclusao(null)
    }
  }

  const handleRemarcar = async () => {
    if (confirmarRemarcar === null) return
    const id = confirmarRemarcar
    try {
      await httpDelete(`agendamentos/${id}`)
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
      success('Agendamento cancelado', 'Agora você pode escolher seu novo horário.')
      router.push('/agendamento')
    } catch (err) {
      toastError('Erro ao remarcar', err instanceof Error ? err.message : 'Não foi possível cancelar o agendamento atual.')
    } finally {
      setConfirmarRemarcar(null)
    }
  }

  const titulo = isTenant ? 'Agendamentos' : 'Meus Agendamentos'
  const descricao = isTenant
    ? 'Todos os agendamentos da sua barbearia'
    : 'Acompanhe seus horários marcados'

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{titulo}</h1>
            <p className="text-zinc-400 mt-2">{descricao}</p>
          </div>
          {!isEmployeeBarber && (
            <Link
              href="/agendamento"
              className="flex items-center gap-2 bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              <Plus size={20} />
              Novo Agendamento
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
            </div>
          </div>
        )}

        {!loading && agendamentos.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Calendar size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum agendamento</h3>
            <p className="text-zinc-400 mb-6">Comece criando seu primeiro agendamento</p>
            {!isEmployeeBarber && (
              <Link
                href="/agendamento"
                className="inline-block bg-yellow-400 text-zinc-900 font-semibold px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
              >
                Criar Agendamento
              </Link>
            )}
          </div>
        )}

        {!loading && agendamentos.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-800">
                  <tr className="text-left text-sm font-semibold text-zinc-400">
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Cliente</th>
                    {!isEmployeeBarber && <th className="px-6 py-3">Profissional</th>}
                    <th className="px-6 py-3">Serviços</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {agendamentos.map((agendamento) => (
                    <tr key={agendamento.id} className="hover:bg-zinc-800/40">
                      <td className="px-6 py-4 text-sm text-white">
                        {new Date(agendamento.data).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <p className="font-medium">{agendamento.usuario?.nome ?? '-'}</p>
                        <p className="text-zinc-500">{agendamento.usuario?.email ?? ''}</p>
                      </td>
                      {!isEmployeeBarber && (
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          {agendamento.profissional?.nome ?? '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(agendamento.servicos ?? []).map((servico, idx) => (
                            <span
                              key={idx}
                              className="bg-yellow-400/15 text-yellow-300 px-2 py-1 rounded text-xs"
                            >
                              {servico.nome}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            agendamento.status === 'confirmado'
                              ? 'bg-green-500/15 text-green-400'
                              : agendamento.status === 'cancelado'
                                ? 'bg-red-500/15 text-red-400'
                                : 'bg-yellow-500/15 text-yellow-400'
                          }`}
                        >
                          {agendamento.status ?? 'agendado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {agendamento.status !== 'concluido' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => setConfirmarRemarcar(agendamento.id)}
                              className="text-yellow-400 hover:text-yellow-300"
                              title="Remarcar Agendamento"
                            >
                              <RotateCw size={18} />
                            </button>
                            <button
                              onClick={() => setConfirmarExclusao(agendamento.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Cancelar Agendamento"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ConfirmModal
            aberto={confirmarExclusao !== null}
            titulo="Excluir Agendamento"
            mensagem="Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita."
            textoConfirmar="Excluir"
            onConfirmar={handleDelete}
            onCancelar={() => setConfirmarExclusao(null)}
        />

        <ConfirmModal
            aberto={confirmarRemarcar !== null}
            titulo="Remarcar Agendamento"
            mensagem="Isso irá cancelar seu agendamento atual e levar você para a tela de horários para criar um novo. Deseja continuar?"
            textoConfirmar="Continuar para Remarcar"
            variante="warning"
            onConfirmar={handleRemarcar}
            onCancelar={() => setConfirmarRemarcar(null)}
        />
      </div>
    </div>
  )
}
