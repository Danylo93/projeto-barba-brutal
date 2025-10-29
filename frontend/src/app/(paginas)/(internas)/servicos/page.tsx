'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scissors, Plus, Trash2, Edit2, Clock, DollarSign } from 'lucide-react'
import Image from 'next/image'
import useAPI from '@/data/hooks/useAPI'

interface Servico {
  id: number
  nome: string
  descricao: string
  preco: number
  duracao: number
  imagemURL?: string
  ativo: boolean
  createdAt: string
}

export default function ServicosPage() {
  const router = useRouter()
  const { httpGet, httpDelete } = useAPI()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchServicos()
  }, [httpGet])

  const fetchServicos = async () => {
    try {
      setLoading(true)

      const data = await httpGet('servicos')
      setServicos(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este serviço?')) return

    try {
      await httpDelete(`servicos/${id}`)
      setServicos(servicos.filter(s => s.id !== id))
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
            <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
            <p className="text-gray-600 mt-2">Gerencie todos os serviços oferecidos pela sua barbearia</p>
          </div>
          <button
            onClick={() => router.push('/servicos/novo')}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus size={20} />
            Novo Serviço
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 mt-4">Carregando serviços...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && servicos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Scissors size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-gray-600 mb-6">Comece adicionando seu primeiro serviço</p>
            <button
              onClick={() => router.push('/servicos/novo')}
              className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Adicionar Serviço
            </button>
          </div>
        )}

        {/* Servicos Grid */}
        {!loading && servicos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicos.map((servico) => (
              <div key={servico.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                {/* Image */}
                <div className="relative h-40 bg-gray-200">
                  {servico.imagemURL ? (
                    <Image
                      src={servico.imagemURL}
                      alt={servico.nome}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <Scissors size={48} className="text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{servico.nome}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      servico.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {servico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {servico.descricao}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign size={18} className="text-green-600" />
                      <span className="font-semibold">R$ {servico.preco.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock size={18} className="text-blue-600" />
                      <span>{servico.duracao} minutos</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/servicos/${servico.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-900 py-2"
                    >
                      <Edit2 size={18} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(servico.id)}
                      className="flex-1 flex items-center justify-center gap-2 text-red-600 hover:text-red-900 py-2"
                    >
                      <Trash2 size={18} />
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

