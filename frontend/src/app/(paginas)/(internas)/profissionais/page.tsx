'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Plus, Trash2, Edit2, Star } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'

interface Profissional {
  id: number
  nome: string
  descricao: string
  imagemUrl: string
  avaliacao: number
  quantidadeAvaliacoes: number
  ativo: boolean
  createdAt: string
}

export default function ProfissionaisPage() {
  const router = useRouter()
  const { httpGet, httpDelete } = useAPI()
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfissionais()
  }, [httpGet])

  const fetchProfissionais = async () => {
    try {
      setLoading(true)

      const data = await httpGet('profissionais')
      setProfissionais(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este profissional?')) return

    try {
      await httpDelete(`profissionais/${id}`)
      setProfissionais(profissionais.filter(p => p.id !== id))
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
            <h1 className="text-3xl font-bold text-white">Profissionais</h1>
            <p className="text-zinc-400 mt-2">Gerencie todos os profissionais da sua barbearia</p>
          </div>
          <button
            onClick={() => router.push('/profissionais/novo')}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Novo Profissional
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-zinc-400 mt-4">Carregando profissionais...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && profissionais.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Users size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum profissional cadastrado</h3>
            <p className="text-zinc-400 mb-6">Comece adicionando seu primeiro profissional</p>
            <button
              onClick={() => router.push('/profissionais/novo')}
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Adicionar Profissional
            </button>
          </div>
        )}

        {/* Profissionais Grid */}
        {!loading && profissionais.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profissionais.map((profissional) => (
              <div key={profissional.id} className="bg-zinc-900 border border-zinc-800 rounded-lg hover:shadow-lg transition-shadow overflow-hidden">
                {/* Image Placeholder */}
                <div className="relative h-48 bg-zinc-800 flex items-center justify-center">
                  <Users size={48} className="text-zinc-600" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-white">{profissional.nome}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      profissional.ativo
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {profissional.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                    {profissional.descricao}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < Math.round(profissional.avaliacao) ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-400">
                      {profissional.avaliacao.toFixed(1)} ({profissional.quantidadeAvaliacoes})
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => router.push(`/profissionais/${profissional.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 text-yellow-400 hover:text-blue-900 py-2"
                    >
                      <Edit2 size={18} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(profissional.id)}
                      className="flex-1 flex items-center justify-center gap-2 text-red-400 hover:text-red-900 py-2"
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

