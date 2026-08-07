'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LogIn,
  Radio,
  ShieldCheck,
  Signal,
} from 'lucide-react'
import useSessao from '@/data/hooks/useSessao'
import useUsuario from '@/data/hooks/useUsuario'
import AuthShell from '@/components/auth/AuthShell'
import { PainelShell, PainelHeader, PainelMain } from '@/components/painel/Painel'
import PainelNav from '@/components/painel/PainelNav'
import {
  BarraComparativa,
  Esqueleto,
  Heroi,
  Inicial,
  Pilula,
  Secao,
  Tile,
  Vazio,
  emReais,
} from '@/components/painel/AdminUI'
import { useToast } from '@/hooks/use-toast'
import { API_BASE } from '@/lib/api-base'

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
  configuracoes?: { evolutionInstance?: string } | null
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

const URL_BASE = API_BASE
const inputClasses =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder-zinc-600 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/40'

/**
 * A API devolve os rótulos do Mercado Pago em inglês e em SCREAMING_CASE. Sem
 * tradução, o admin lia "rejected" e "CREDIT_CARD" no meio de uma tela toda em
 * português — e status desconhecido vira o texto cru, que é melhor do que
 * esconder um estado que ninguém previu.
 */
function statusEmPortugues(status: string): string {
  const traducao: Record<string, string> = {
    approved: 'Aprovado',
    pending: 'Aguardando',
    in_process: 'Em análise',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
    refunded: 'Devolvido',
  }
  return traducao[status] ?? status
}

function metodoEmPortugues(metodo: string): string {
  const traducao: Record<string, string> = {
    pix: 'Pix',
    credit_card: 'Cartão de crédito',
    debit_card: 'Cartão de débito',
    boleto: 'Boleto',
  }
  return traducao[String(metodo).toLowerCase()] ?? String(metodo).replace(/_/g, ' ')
}

/** Cabeçalho de coluna, no mesmo tom em todas as tabelas. */
const th = 'px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500'

export default function AdminPage() {
  const { token, criarSessao } = useSessao()
  const { usuario } = useUsuario()
  const { success: toastSuccess, error: toastError } = useToast()
  const isAdmin = usuario?.tipo === 'admin'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<TenantAdmin[]>([])
  const [alterandoId, setAlterandoId] = useState<number | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  // A instance da Evolution é criada por nós, no servidor — por isso quem a
  // digita é o admin. Na mão do dono da barbearia só dava para escrever um
  // nome que nunca conecta, ou o de outra barbearia.
  const [instances, setInstances] = useState<Record<number, string>>({})
  const [salvandoInstance, setSalvandoInstance] = useState<number | null>(null)
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
        const lista: TenantAdmin[] = data.tenants || []
        setTenants(lista)
        setInstances(
          Object.fromEntries(lista.map((t) => [t.id, t.configuracoes?.evolutionInstance ?? ''])),
        )
      }
    } catch {
      /* silencioso */
    }
  }

  const salvarInstance = async (tenant: TenantAdmin) => {
    const instance = (instances[tenant.id] ?? '').trim()
    try {
      setSalvandoInstance(tenant.id)
      const response = await fetch(`${URL_BASE}/admin/tenants/${tenant.id}/whatsapp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instance }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.message || 'Não foi possível salvar a instance.')
      }
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenant.id
            ? { ...t, configuracoes: { ...(t.configuracoes ?? {}), evolutionInstance: instance } }
            : t,
        ),
      )
      toastSuccess(
        instance ? 'Instance vinculada' : 'Instance removida',
        instance
          ? `${tenant.nome} agora atende pela instance ${instance}.`
          : `${tenant.nome} ficou sem canal de WhatsApp.`,
      )
    } catch (erro) {
      toastError('Instance não salva', erro instanceof Error ? erro.message : 'Erro desconhecido')
    } finally {
      setSalvandoInstance(null)
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
        const msg = data.message || 'Credenciais inválidas'
        setLoginError(msg)
        toastError('Não foi possível entrar', msg)
        return
      }
      criarSessao(data.access_token)
    } catch (err) {
      setLoginError('Erro de conexão. Tente novamente.')
      toastError('Erro de conexão', 'Tente novamente em instantes.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Gate de login do admin. É a porta do painel que enxerga TODAS as
  // barbearias — a tela diz isso antes de pedir a senha.
  if (!isAdmin) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-7">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-300">
              <ShieldCheck size={13} /> Área restrita
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white">Console do SaaS</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              Daqui se enxerga toda a base: barbearias, assinaturas e pagamentos.
            </p>
          </div>
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            {loginError && (
              <div className="rounded-xl border border-red-800/70 bg-red-950/50 px-4 py-3 text-sm text-red-300">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-black text-zinc-950 shadow-[0_0_24px_rgba(250,204,21,0.18)] transition-all hover:bg-yellow-300 hover:shadow-[0_0_32px_rgba(250,204,21,0.28)] active:scale-[0.99] disabled:opacity-60"
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
      <PainelShell>
        <PainelNav />
        <PainelHeader titulo="Console do SaaS" descricao="Carregando a base..." />
        <PainelMain>
          <div className="grid gap-5 lg:grid-cols-3">
            <Esqueleto className="h-52 lg:col-span-1" />
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
              <Esqueleto className="h-32" />
              <Esqueleto className="h-32" />
              <Esqueleto className="h-32" />
              <Esqueleto className="h-32" />
            </div>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-5">
            <Esqueleto className="h-72 lg:col-span-3" />
            <Esqueleto className="h-72 lg:col-span-2" />
          </div>
          <Esqueleto className="mt-5 h-80" />
        </PainelMain>
      </PainelShell>
    )
  }

  if (!stats) {
    return (
      <PainelShell>
        <PainelNav />
        <PainelMain>
          <div className="mx-auto max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 text-center">
            <h2 className="text-xl font-black text-white">Não deu para carregar a base</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              O servidor não respondeu com as estatísticas. Pode ter sido uma oscilação — tente de novo.
            </p>
            <button
              onClick={fetchDashboardStats}
              className="mt-6 rounded-xl bg-yellow-400 px-5 py-2.5 font-black text-zinc-950 transition-colors hover:bg-yellow-300"
            >
              Tentar de novo
            </button>
          </div>
        </PainelMain>
      </PainelShell>
    )
  }

  const assinaturas = stats.planosStats.reduce((total, plano) => total + plano.assinantes, 0)
  const maiorPlano = Math.max(1, ...stats.planosStats.map((plano) => plano.assinantes))
  const planosOrdenados = [...stats.planosStats].sort((a, b) => b.assinantes - a.assinantes)
  const pendentes = pagamentos.filter((p) => p.status !== 'approved').length
  const percentualAtivas =
    stats.totalTenants > 0 ? Math.round((stats.activeTenants / stats.totalTenants) * 100) : 0
  const semCanal = tenants.filter((t) => !(t.configuracoes?.evolutionInstance ?? '').trim()).length

  return (
    <PainelShell>
      <PainelNav />
      <PainelHeader
        titulo="Console do SaaS"
        descricao="Toda a base do Barbearia Brutal em uma tela"
        acao={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
              <Radio size={13} className="animate-pulse" /> Sistema no ar
            </span>
            <a
              href="/"
              className="inline-flex items-center rounded-xl border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              Voltar ao site
            </a>
          </div>
        }
      />

      <PainelMain>
        <div className="grid gap-5 lg:grid-cols-3">
          <Heroi
            rotulo="Receita total"
            prefixo="R$"
            valor={stats.totalRevenue.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            apoio={
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Assinaturas</p>
                  <p className="mt-0.5 text-lg font-black text-white">{assinaturas}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Base ativa</p>
                  <p className="mt-0.5 text-lg font-black text-white">{percentualAtivas}%</p>
                </div>
              </div>
            }
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
            <Tile
              rotulo="Barbearias"
              valor={String(stats.totalTenants)}
              contexto={`${stats.inactiveTenants} suspensa${stats.inactiveTenants === 1 ? '' : 's'}`}
              icone={<Building2 size={18} />}
            />
            <Tile
              rotulo="Ativas"
              valor={String(stats.activeTenants)}
              contexto={`de ${stats.totalTenants} barbearias`}
              icone={<CheckCircle2 size={18} />}
              destaque
            />
            <Tile
              rotulo="Agendamentos"
              valor={stats.totalAgendamentos.toLocaleString('pt-BR')}
              contexto="desde o começo"
              icone={<CalendarDays size={18} />}
            />
            <Tile
              rotulo="Canais de WhatsApp"
              valor={String(tenants.length - semCanal)}
              contexto={
                semCanal > 0
                  ? `${semCanal} sem instance vinculada`
                  : 'todas as barbearias vinculadas'
              }
              icone={<Signal size={18} />}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-5">
          <Secao
            titulo="Distribuição por plano"
            descricao="Assinantes em cada plano, e o que cada um traz"
            contagem={`${assinaturas} assinantes`}
            className="lg:col-span-3"
          >
            <div className="divide-y divide-zinc-800/70 px-5 py-2 sm:px-6">
              {planosOrdenados.length === 0 ? (
                <Vazio>Nenhum plano cadastrado ainda.</Vazio>
              ) : (
                planosOrdenados.map((plano) => (
                  <BarraComparativa
                    key={plano.id}
                    rotulo={plano.nome}
                    valor={plano.assinantes}
                    maximo={maiorPlano}
                    valorEscrito={`${plano.assinantes} ${plano.assinantes === 1 ? 'assinante' : 'assinantes'}`}
                    apoio={`${emReais(plano.preco)}/mês · ${emReais(plano.receita)} no total`}
                  />
                ))
              )}
            </div>
          </Secao>

          <Secao
            titulo="Chegaram por último"
            contagem={`${stats.recentTenants.length}`}
            className="lg:col-span-2"
          >
            <div className="divide-y divide-zinc-800/70">
              {stats.recentTenants.length === 0 ? (
                <Vazio>Nenhuma barbearia cadastrada ainda.</Vazio>
              ) : (
                stats.recentTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                    <Inicial nome={tenant.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{tenant.nome}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {tenant._count.usuarios} usuários · {tenant._count.agendamentos} agendamentos
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Pilula estado={tenant.ativo ? 'boa' : 'ruim'}>
                        {tenant.ativo ? 'Ativa' : 'Suspensa'}
                      </Pilula>
                      {tenant.assinatura && (
                        <p className="mt-1.5 text-[11px] text-zinc-500">{tenant.assinatura.plano.nome}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Secao>
        </div>

        <div className="mt-5">
          <Secao
            titulo="Barbearias"
            descricao="A instance da Evolution é criada por nós — o dono só conecta o número."
            contagem={`${tenants.length}`}
          >
            <p className="px-5 pt-4 text-xs text-zinc-600 lg:hidden">
              Arraste a tabela para o lado para ver o resto.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-zinc-800/70">
                    <th className={th}>Barbearia</th>
                    <th className={th}>Plano</th>
                    <th className={`${th} text-right`}>Usuários</th>
                    <th className={`${th} text-right`}>Agendamentos</th>
                    <th className={th}>Instance da Evolution</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {tenants.map((tenant) => {
                    const digitada = instances[tenant.id] ?? ''
                    const salva = tenant.configuracoes?.evolutionInstance ?? ''
                    const mudou = digitada !== salva

                    return (
                      <tr key={tenant.id} className="transition-colors hover:bg-zinc-800/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Inicial nome={tenant.nome} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{tenant.nome}</p>
                              <p className="truncate text-xs text-zinc-500">{tenant.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {tenant.assinatura ? (
                            <>
                              <p className="text-sm font-semibold text-zinc-200">
                                {tenant.assinatura.plano.nome}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {tenant.assinatura.status === 'active' ? 'ativa' : tenant.assinatura.status}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-zinc-600">Sem plano</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-zinc-300 tabular-nums">
                          {tenant._count.usuarios}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-zinc-300 tabular-nums">
                          {tenant._count.agendamentos}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={digitada}
                              onChange={(e) =>
                                setInstances((prev) => ({ ...prev, [tenant.id]: e.target.value }))
                              }
                              placeholder="sem canal"
                              aria-label={`Instance da Evolution de ${tenant.nome}`}
                              className={`w-44 rounded-lg border bg-zinc-950/60 px-3 py-1.5 font-mono text-xs text-white placeholder-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-yellow-400/40 ${
                                mudou ? 'border-yellow-400/60' : 'border-zinc-800 focus:border-yellow-400'
                              }`}
                            />
                            {mudou && (
                              <button
                                onClick={() => salvarInstance(tenant)}
                                disabled={salvandoInstance === tenant.id}
                                className="shrink-0 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-zinc-950 transition-colors hover:bg-yellow-300 disabled:opacity-50"
                              >
                                {salvandoInstance === tenant.id ? 'Salvando' : 'Salvar'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Pilula estado={tenant.ativo ? 'boa' : 'ruim'}>
                            {tenant.ativo ? 'Ativa' : 'Suspensa'}
                          </Pilula>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => alternarStatusTenant(tenant)}
                            disabled={alterandoId === tenant.id}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                              tenant.ativo
                                ? 'border-zinc-800 text-zinc-300 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300'
                                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                            }`}
                          >
                            {alterandoId === tenant.id ? '...' : tenant.ativo ? 'Suspender' : 'Reativar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {tenants.length === 0 && <Vazio>Nenhuma barbearia cadastrada ainda.</Vazio>}
            </div>
          </Secao>
        </div>

        <div className="mt-5">
          <Secao
            titulo="Pagamentos"
            descricao="Pix e Mercado Pago. Confirmar aqui ativa a assinatura na hora."
            contagem={`${pagamentos.length}`}
            acao={
              pendentes > 0 ? (
                <Pilula estado="atencao">
                  {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
                </Pilula>
              ) : undefined
            }
          >
            {pagamentos.length === 0 ? (
              <Vazio>Nenhum pagamento registrado ainda.</Vazio>
            ) : (
              <>
                <p className="px-5 pt-4 text-xs text-zinc-600 lg:hidden">
                  Arraste a tabela para o lado para ver o resto.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="border-b border-zinc-800/70">
                      <th className={th}>Barbearia</th>
                      <th className={th}>Plano</th>
                      <th className={`${th} text-right`}>Valor</th>
                      <th className={th}>Método</th>
                      <th className={th}>Status</th>
                      <th className={th}>Data</th>
                      <th className={`${th} text-right`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {pagamentos.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-zinc-800/30">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-bold text-white">{p.barbearia}</p>
                          <p className="text-xs text-zinc-500">{p.email}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-zinc-300">{p.plano}</td>
                        <td className="px-5 py-3.5 text-right text-sm font-bold text-white tabular-nums">
                          {emReais(p.valor)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-zinc-400">
                            <CreditCard size={13} /> {metodoEmPortugues(p.metodo)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Pilula
                            estado={
                              p.status === 'approved' ? 'boa' : p.status === 'pending' ? 'atencao' : 'ruim'
                            }
                          >
                            {statusEmPortugues(p.status)}
                          </Pilula>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-zinc-400 tabular-nums">
                          {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {p.status !== 'approved' && (
                            <button
                              onClick={() => confirmarPagamento(p.id)}
                              disabled={confirmandoId === p.id}
                              className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
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
              </>
            )}
          </Secao>
        </div>
      </PainelMain>
    </PainelShell>
  )
}
