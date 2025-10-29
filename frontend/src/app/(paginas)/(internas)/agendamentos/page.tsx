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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-gray-600 mt-2">Gerencie seus agendamentos do dia</p>
          </div>
          <Link
            href="/agendamento"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Agendamento
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {mapped.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento</h3>
            <p className="text-gray-600 mb-6">Comece criando seu primeiro agendamento</p>
            <Link
              href="/agendamento"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Agendamento
            </Link>
          </div>
        )}

        {/* Agendamentos List */}
        {mapped.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data/Hora</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Profissional</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Serviços</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mapped.map((agendamento) => (
                    <tr key={agendamento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(agendamento.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{agendamento.usuario.nome}</p>
                          <p className="text-gray-600">{agendamento.usuario.email || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {agendamento.profissional?.nome || usuario?.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-wrap gap-1">
                          {agendamento.servicos.map((servico, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {servico.nome}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          agendamento.status === 'confirmado'
                            ? 'bg-green-100 text-green-800'
                            : agendamento.status === 'cancelado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {agendamento.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/agendamentos/${agendamento.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visualizar"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(agendamento.id)}
                            className="text-red-600 hover:text-red-900"
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
