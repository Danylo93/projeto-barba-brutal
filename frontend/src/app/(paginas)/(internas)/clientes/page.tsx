'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Mail, Phone } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'
import Modal, { inputModalClasses } from '@/components/painel/Modal'
import { formatarTelefone, formatarTelefoneInput } from '@/lib/agendamento-utils'

interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  barbeiro?: boolean
  createdAt: string
}

const formVazio = { nome: '', email: '', telefone: '', senha: '' }

export default function ClientesPage() {
  const { httpGet, httpDelete } = useAPI()
  const { usuario } = useUsuario()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetchClientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchClientes = async () => {
    try {
      setLoading(true)
      const data = await httpGet('usuarios')
      setClientes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const abrirNovo = () => {
    setForm(formVazio)
    setError('')
    setModalAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setError('')
    try {
      const response = await fetch('/api/auth/usuario/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          telefone: form.telefone.replace(/\D/g, ''),
          barbeiro: false,
          tenantId: usuario?.tenantId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível cadastrar o cliente')
      }
      setModalAberto(false)
      await fetchClientes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este cliente?')) return
    try {
      await httpDelete(`usuarios/${id}`)
      setClientes(clientes.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const filteredClientes = clientes.filter(
    (cliente) =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Clientes</h1>
            <p className="text-zinc-400 mt-2">Gerencie os clientes da sua barbearia</p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            <Plus size={20} />
            Novo Cliente
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
          />
        </div>

        {error && !modalAberto && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <p className="text-zinc-400 mt-4">Carregando clientes...</p>
          </div>
        )}

        {!loading && filteredClientes.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Users size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-zinc-400 mb-6">Comece adicionando seu primeiro cliente</p>
            <button
              onClick={abrirNovo}
              className="inline-block bg-yellow-400 text-zinc-900 font-semibold px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Adicionar Cliente
            </button>
          </div>
        )}

        {!loading && filteredClientes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes.map((cliente) => (
              <div
                key={cliente.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{cliente.nome}</h3>
                    <p className="text-sm text-zinc-400">
                      {cliente.barbeiro ? 'Barbeiro' : 'Cliente'} · desde{' '}
                      {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(cliente.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Deletar"
                  >
                    <Trash2 size={18} />
                  </button>
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
                      {formatarTelefone(cliente.telefone)}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal aberto={modalAberto} titulo="Novo Cliente" onFechar={() => setModalAberto(false)}>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Nome</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do cliente"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">E-mail</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Telefone</label>
            <input
              required
              type="tel"
              value={formatarTelefone(form.telefone)}
              onChange={(e) => setForm({ ...form, telefone: formatarTelefoneInput(e.target.value) })}
              placeholder="(11) 90000-0000"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Senha inicial</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className={inputModalClasses}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-2.5 rounded-lg bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
