'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSessao from '@/data/hooks/useSessao'
import useUsuario from '@/data/hooks/useUsuario'

interface DashboardStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  totalRevenue: number
  totalAgendamentos: number
  planosStats: Array<{
    id: number
    nome: string
    preco: number
    assinantes: number
    receita: number
  }>
  recentTenants: Array<{
    id: number
    nome: string
    email: string
    ativo: boolean
    createdAt: string
    assinatura?: {
      plano: {
        nome: string
        preco: number
      }
    }
    _count: {
      usuarios: number
      agendamentos: number
    }
  }>
}

interface TenantAdmin {
  id: number
  nome: string
  email: string
  ativo: boolean
  assinatura?: { status: string; plano: { nome: string; preco: number } }
  _count: { usuarios: number; agendamentos: number }
}

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE

export default function AdminPage() {
  const { token, criarSessao } = useSessao()
  const { usuario } = useUsuario()
  const isAdmin = usuario?.tipo === 'admin'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<TenantAdmin[]>([])
  const [alterandoId, setAlterandoId] = useState<number | null>(null)

  // Estado do formulário de login de admin
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    if (isAdmin && token) {
      fetchDashboardStats()
      fetchTenants()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, token])

  const fetchTenants = async () => {
    try {
      const response = await fetch(`${URL_BASE}/admin/tenants?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants || [])
      }
    } catch {
      // silencioso: a seção simplesmente não renderiza sem dados
    }
  }

  const alternarStatusTenant = async (tenant: TenantAdmin) => {
    const acao = tenant.ativo ? 'desativar' : 'ativar'
    if (!confirm(`Deseja ${acao} a barbearia "${tenant.nome}"?`)) return
    try {
      setAlterandoId(tenant.id)
      const response = await fetch(`${URL_BASE}/admin/tenants/${tenant.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !tenant.ativo }),
      })
      if (response.ok) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, ativo: !t.ativo } : t))
        )
        fetchDashboardStats()
      }
    } finally {
      setAlterandoId(null)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao buscar estatísticas:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await response.json()
      if (!response.ok) {
        setLoginError(data.message || 'Credenciais inválidas')
        return
      }
      criarSessao(data.access_token)
    } catch (err) {
      setLoginError('Erro de conexão. Tente novamente.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Sem sessão de admin: exibir tela de login
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Painel do Administrador</h2>
            <p className="mt-2 text-sm text-gray-600">Acesso restrito ao administrador do sistema</p>
          </div>
          <form onSubmit={handleAdminLogin} className="bg-white shadow rounded-lg p-6 space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {loginError}
              </div>
            )}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="admin-senha" className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                id="admin-senha"
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex justify-center py-2 px-4 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Erro ao carregar dashboard</h2>
          <p className="text-gray-600 mb-4">Não foi possível carregar as estatísticas do sistema.</p>
          <button
            onClick={fetchDashboardStats}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
              <p className="text-gray-600">Visão geral do sistema SaaS</p>
            </div>
            <Link
              href="/"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Voltar ao Site
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Tenants
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalTenants}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tenants Ativos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.activeTenants}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Receita Total
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Agendamentos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalAgendamentos.toLocaleString('pt-BR')}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gestão de barbearias (tenants) */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gerenciar Barbearias</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Barbearia</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Plano</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Usuários</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Agendamentos</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-900">{tenant.nome}</p>
                        <p className="text-gray-500">{tenant.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {tenant.assinatura ? (
                          <>
                            <p>{tenant.assinatura.plano.nome}</p>
                            <p className="text-xs text-gray-500">
                              {tenant.assinatura.status === 'active' ? 'ativa' : tenant.assinatura.status}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-400">Sem plano</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{tenant._count.usuarios}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{tenant._count.agendamentos}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tenant.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => alternarStatusTenant(tenant)}
                          disabled={alterandoId === tenant.id}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                            tenant.ativo
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {alterandoId === tenant.id
                            ? '...'
                            : tenant.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas por Plano</h3>
              <div className="space-y-4">
                {stats.planosStats.map((plano) => (
                  <div key={plano.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{plano.nome}</h4>
                      <p className="text-sm text-gray-500">R$ {plano.preco.toFixed(2)}/mês</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{plano.assinantes} assinantes</p>
                      <p className="text-sm text-gray-500">R$ {plano.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tenants Recentes</h3>
              <div className="space-y-4">
                {stats.recentTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{tenant.nome}</h4>
                      <p className="text-sm text-gray-500">{tenant.email}</p>
                      <p className="text-xs text-gray-400">
                        {tenant._count.usuarios} usuários • {tenant._count.agendamentos} agendamentos
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tenant.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {tenant.assinatura && (
                        <p className="text-xs text-gray-500 mt-1">{tenant.assinatura.plano.nome}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
