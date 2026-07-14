'use client'

import { useState, useEffect } from 'react'
import { Building2, CheckCircle2, DollarSign, CalendarDays, LogIn } from 'lucide-react'
import useSessao from '@/data/hooks/useSessao'
import useUsuario from '@/data/hooks/useUsuario'
import AuthShell from '@/components/auth/AuthShell'
import {
  PainelShell,
  PainelHeader,
  PainelMain,
  Card,
  StatCard,
} from '@/components/painel/Painel'
import PainelNav from '@/components/painel/PainelNav'

interface DashboardStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  totalRevenue: number
  totalAgendamentos: number
  planosStats: Array<{ id: number; nome: string; preco: number; assinantes: number; receita: number }>
  recentTenants: Array<{
    id: number
    nome: string
    email: string
    ativo: boolean
    createdAt: string
    assinatura?: { plano: { nome: string; preco: number } }
    _count: { usuarios: number; agendamentos: number }
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

interface Pagamento {
  id: number
  valor: number
  status: string
  metodo: string
  barbearia?: string
  email?: string
  plano?: string
  createdAt: string
}

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE
const inputClasses =
  'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

function Badge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
        ativo ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export default function AdminPage() {
  const { token, criarSessao } = useSessao()
  const { usuario } = useUsuario()
  const isAdmin = usuario?.tipo === 'admin'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<TenantAdmin[]>([])
  const [alterandoId, setAlterandoId] = useState<number | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    if (isAdmin && token) {
      fetchDashboardStats()
      fetchTenants()
      fetchPagamentos()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, token])

  const fetchPagamentos = async () => {
    try {
      const response = await fetch(`${URL_BASE}/assinaturas/pagamentos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) setPagamentos(await response.json())
    } catch {
      /* silencioso */
    }
  }

  const confirmarPagamento = async (id: number) => {
    if (!confirm('Confirmar este pagamento manualmente e ativar a assinatura?')) return
    try {
      setConfirmandoId(id)
      const response = await fetch(`${URL_BASE}/assinaturas/pagamentos/${id}/confirmar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setPagamentos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p)))
        fetchTenants()
      }
    } finally {
      setConfirmandoId(null)
    }
  }

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
      /* silencioso */
    }
  }

  const alternarStatusTenant = async (tenant: TenantAdmin) => {
    const acao = tenant.ativo ? 'desativar' : 'ativar'
    if (!confirm(`Deseja ${acao} a barbearia "${tenant.nome}"?`)) return
    try {
      setAlterandoId(tenant.id)
      const response = await fetch(`${URL_BASE}/admin/tenants/${tenant.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ativo: !tenant.ativo }),
      })
      if (response.ok) {
        setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, ativo: !t.ativo } : t)))
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (response.ok) setStats(await response.json())
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Erro ao buscar estatísticas:', error)
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

  // Gate de login do admin (mesmo visual das telas de auth)
  if (!isAdmin) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Painel do Administrador</h1>
            <p className="text-sm text-zinc-400 mt-1">Acesso restrito ao administrador do sistema</p>
          </div>
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            {loginError && (
              <div className="bg-red-950/60 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className={inputClasses}
            />
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              className={inputClasses}
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
            >
              <LogIn size={18} /> {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </AuthShell>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Erro ao carregar dashboard</h2>
          <p className="text-zinc-400 mb-4">Não foi possível carregar as estatísticas do sistema.</p>
          <button
            onClick={fetchDashboardStats}
            className="bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <PainelShell>
      <PainelNav />
      <PainelHeader
        titulo="Painel do Administrador"
        descricao="Visão geral do sistema SaaS Barba Brutal"
        acao={
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-300 border border-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Voltar ao site
          </a>
        }
      />

      <PainelMain>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard rotulo="Total de Barbearias" valor={stats.totalTenants} icone={<Building2 size={22} />} />
          <StatCard rotulo="Ativas" valor={stats.activeTenants} icone={<CheckCircle2 size={22} />} cor="text-green-400" />
          <StatCard
            rotulo="Receita Total"
            valor={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icone={<DollarSign size={22} />}
          />
          <StatCard
            rotulo="Agendamentos"
            valor={stats.totalAgendamentos.toLocaleString('pt-BR')}
            icone={<CalendarDays size={22} />}
            cor="text-blue-400"
          />
        </div>

        {/* Gestão de barbearias */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Gerenciar Barbearias</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-800">
                <tr className="text-left text-xs font-semibold text-zinc-400 uppercase">
                  <th className="px-4 py-3">Barbearia</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Usuários</th>
                  <th className="px-4 py-3">Agendamentos</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-white">{tenant.nome}</p>
                      <p className="text-zinc-500">{tenant.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {tenant.assinatura ? (
                        <>
                          <p>{tenant.assinatura.plano.nome}</p>
                          <p className="text-xs text-zinc-500">
                            {tenant.assinatura.status === 'active' ? 'ativa' : tenant.assinatura.status}
                          </p>
                        </>
                      ) : (
                        <span className="text-zinc-600">Sem plano</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{tenant._count.usuarios}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{tenant._count.agendamentos}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge ativo={tenant.ativo} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => alternarStatusTenant(tenant)}
                        disabled={alterandoId === tenant.id}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                          tenant.ativo
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        {alterandoId === tenant.id ? '...' : tenant.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagamentos (Pix / Mercado Pago) */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Pagamentos</h3>
          {pagamentos.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum pagamento registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-800">
                  <tr className="text-left text-xs font-semibold text-zinc-400 uppercase">
                    <th className="px-4 py-3">Barbearia</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {pagamentos.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40">
                      <td className="px-4 py-3 text-sm">
                        <p className="text-white">{p.barbearia}</p>
                        <p className="text-zinc-500 text-xs">{p.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{p.plano}</td>
                      <td className="px-4 py-3 text-sm text-white">
                        R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 uppercase">{p.metodo}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            p.status === 'approved'
                              ? 'bg-green-500/15 text-green-400'
                              : p.status === 'pending'
                                ? 'bg-yellow-500/15 text-yellow-400'
                                : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p.status !== 'approved' && (
                          <button
                            onClick={() => confirmarPagamento(p.id)}
                            disabled={confirmandoId === p.id}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {confirmandoId === p.id ? '...' : 'Confirmar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Estatísticas por Plano</h3>
            <div className="space-y-3">
              {stats.planosStats.map((plano) => (
                <div
                  key={plano.id}
                  className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-white">{plano.nome}</h4>
                    <p className="text-sm text-zinc-500">R$ {plano.preco.toFixed(2)}/mês</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{plano.assinantes} assinantes</p>
                    <p className="text-sm text-yellow-400">
                      R$ {plano.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Barbearias Recentes</h3>
            <div className="space-y-3">
              {stats.recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-white">{tenant.nome}</h4>
                    <p className="text-sm text-zinc-500">{tenant.email}</p>
                    <p className="text-xs text-zinc-600">
                      {tenant._count.usuarios} usuários • {tenant._count.agendamentos} agendamentos
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge ativo={tenant.ativo} />
                    {tenant.assinatura && (
                      <p className="text-xs text-zinc-500 mt-1">{tenant.assinatura.plano.nome}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PainelMain>
    </PainelShell>
  )
}
