'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Plus, Trash2, Eye } from 'lucide-react'
import useProfissionalAgenda from '@/data/hooks/useProfissionalAgenda'
import useUsuario from '@/data/hooks/useUsuario'

interface AgendamentoUI {
  id: number
  data: string
  profissional?: { nome: string }
  servicos: Array<{ nome: string; preco: number }>
  usuario: { nome: string; email?: string }
  status?: string
}

export default function AgendamentosPage() {
  const router = useRouter()
  const { usuario } = useUsuario()
  const { agendamentos, excluirAgendamento } = useProfissionalAgenda()
  const [error, setError] = useState('')

  const mapped: AgendamentoUI[] = (agendamentos || []).map((a: any) => ({
    id: a.id,
    data: a.data,
    profissional: a.profissional || { nome: usuario?.nome ?? 'Profissional' },
    servicos: a.servicos || [],
    usuario: a.usuario || { nome: 'Cliente', email: a.usuario?.email },
    status: a.status || 'agendado',
  }))

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este agendamento?')) return
    try {
      await excluirAgendamento(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Agendamentos</h1>
            <p className="text-zinc-400 mt-2">Gerencie seus agendamentos do dia</p>
          </div>
          <Link
            href="/agendamento"
            className="flex items-center gap-2 bg-yellow-400 text-zinc-900 px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            <Plus size={20} />
            Novo Agendamento
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {mapped.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Calendar size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum agendamento</h3>
            <p className="text-zinc-400 mb-6">Comece criando seu primeiro agendamento</p>
            <Link
              href="/agendamento"
              className="inline-block bg-yellow-400 text-zinc-900 px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Criar Agendamento
            </Link>
          </div>
        )}

        {/* Agendamentos List */}
        {mapped.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Data/Hora</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Cliente</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Profissional</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Serviços</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {mapped.map((agendamento) => (
                    <tr key={agendamento.id} className="hover:bg-zinc-950">
                      <td className="px-6 py-4 text-sm text-white">
                        {new Date(agendamento.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <div>
                          <p className="font-medium">{agendamento.usuario.nome}</p>
                          <p className="text-zinc-400">{agendamento.usuario.email || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {agendamento.profissional?.nome || usuario?.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <div className="flex flex-wrap gap-1">
                          {agendamento.servicos.map((servico, idx) => (
                            <span key={idx} className="bg-yellow-400/15 text-yellow-300 px-2 py-1 rounded text-xs">
                              {servico.nome}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          agendamento.status === 'confirmado'
                            ? 'bg-green-500/15 text-green-400'
                            : agendamento.status === 'cancelado'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {agendamento.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/agendamentos/${agendamento.id}`)}
                            className="text-yellow-400 hover:text-blue-900"
                            title="Visualizar"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(agendamento.id)}
                            className="text-red-400 hover:text-red-900"
                            title="Deletar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
