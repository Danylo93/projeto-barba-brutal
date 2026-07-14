'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Plus, Trash2, Edit2, Mail, Phone } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'

interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  endereco?: string
  agendamentos?: number
  createdAt: string
}

export default function ClientesPage() {
  const router = useRouter()
  const { httpGet, httpDelete } = useAPI()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchClientes()
  }, [httpGet])

  const fetchClientes = async () => {
    try {
      setLoading(true)

      const data = await httpGet('usuarios')
      setClientes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este cliente?')) return

    try {
      await httpDelete(`usuarios/${id}`)
      setClientes(clientes.filter(c => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Clientes</h1>
            <p className="text-zinc-400 mt-2">Gerencie todos os clientes da sua barbearia</p>
          </div>
          <button
            onClick={() => router.push('/clientes/novo')}
            className="flex items-center gap-2 bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            <Plus size={20} />
            Novo Cliente
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
          />
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <p className="text-zinc-400 mt-4">Carregando clientes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredClientes.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Users size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-zinc-400 mb-6">Comece adicionando seu primeiro cliente</p>
            <button
              onClick={() => router.push('/clientes/novo')}
              className="inline-block bg-yellow-400 text-zinc-900 px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Adicionar Cliente
            </button>
          </div>
        )}

        {/* Clientes Grid */}
        {!loading && filteredClientes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes.map((cliente) => (
              <div key={cliente.id} className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{cliente.nome}</h3>
                    <p className="text-sm text-zinc-400">
                      Membro desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/clientes/${cliente.id}`)}
                      className="text-zinc-400 hover:text-yellow-400"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Deletar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Mail size={16} />
                    <a href={`mailto:${cliente.email}`} className="hover:text-yellow-400">
                      {cliente.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Phone size={16} />
                    <a href={`tel:${cliente.telefone}`} className="hover:text-yellow-400">
                      {cliente.telefone}
                    </a>
                  </div>
                  {cliente.endereco && (
                    <div className="text-zinc-400">
                      <p className="text-xs text-zinc-500">Endereço</p>
                      <p>{cliente.endereco}</p>
                    </div>
                  )}
                </div>

                {cliente.agendamentos !== undefined && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-sm text-zinc-400">
                      <span className="font-semibold text-white">{cliente.agendamentos}</span> agendamentos
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

