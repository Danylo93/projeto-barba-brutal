'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Calendar,
    Users,
    DollarSign,
    ChevronRight,
    Scissors,
    UserCog,
    CreditCard,
    Clock,
    ArrowRight,
    Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'
import useTrialStatus from '@/hooks/useTrialStatus'
import {
    PainelShell,
    PainelHeader,
    PainelMain,
    Card,
    StatCard,
} from '@/components/painel/Painel'
import PainelNav from '@/components/painel/PainelNav'
import PaginaPublicaCard from '@/components/painel/PaginaPublicaCard'
import TrialBanner from '@/components/shared/TrialBanner'

interface Tenant {
    id: number
    nome: string
    email: string
    telefone: string
    endereco?: string
    cnpj?: string
    dominio?: string | null
    ativo: boolean
    createdAt: string
}

interface Stats {
    agendamentosHoje: number
    clientesAtivos: number
    receitaMes: number
}

const acoesRapidas = [
    { href: '/agendamentos', rotulo: 'Ver Agendamentos', icone: Calendar },
    { href: '/clientes', rotulo: 'Gerenciar Clientes', icone: Users },
    { href: '/profissionais', rotulo: 'Gerenciar Profissionais', icone: UserCog },
    { href: '/servicos', rotulo: 'Gerenciar Serviços', icone: Scissors },
    { href: '/assinatura', rotulo: 'Meu Plano', icone: CreditCard },
]

// Configuração de cores por urgência do trial
const urgenciaCorConfig = {
    safe: {
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        progress: 'bg-emerald-400',
        glow: 'shadow-[0_0_30px_rgba(52,211,153,0.08)]',
    },
    warning: {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        progress: 'bg-amber-400',
        glow: 'shadow-[0_0_30px_rgba(251,191,36,0.08)]',
    },
    danger: {
        badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        progress: 'bg-orange-400',
        glow: 'shadow-[0_0_30px_rgba(251,146,60,0.1)]',
    },
    critical: {
        badge: 'bg-red-500/15 text-red-400 border-red-500/30',
        progress: 'bg-red-400',
        glow: 'shadow-[0_0_30px_rgba(248,113,113,0.12)]',
    },
}

export default function DashboardPage() {
    const router = useRouter()
    const { httpGet } = useAPI()
    const { carregando, token } = useSessao()
    const trial = useTrialStatus()
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (carregando) return
        if (!token) {
            router.push('/login')
            return
        }

        httpGet('/tenants/me')
            .then((data) => {
                if (data?.id && data?.nome) setTenant(data)
                else router.push('/login')
            })
            .catch(() => router.push('/login'))
            .finally(() => setLoading(false))

        httpGet('/tenants/me/stats')
            .then((data) => setStats(typeof data?.receitaMes === 'number' ? data : null))
            .catch(() => setStats(null))
    }, [httpGet, router, carregando, token])

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-800 border-t-yellow-400 mx-auto" />
                        <div className="absolute inset-0 rounded-full animate-pulse-glow" />
                    </div>
                    <p className="mt-4 text-zinc-400 text-sm">Carregando dashboard...</p>
                </div>
            </div>
        )
    }

    if (!tenant) return null

    const trialConfig = trial.emTeste ? urgenciaCorConfig[trial.urgencia] : null

    return (
        <PainelShell>
            <PainelNav />
            <TrialBanner />
            <PainelHeader
                titulo={`Olá, ${tenant.nome}`}
                descricao="Painel de gestão da sua barbearia"
            />

            <PainelMain>
                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
                >
                    <StatCard
                        rotulo="Agendamentos Hoje"
                        valor={stats ? stats.agendamentosHoje : '—'}
                        icone={<Calendar size={22} />}
                    />
                    <StatCard
                        rotulo="Clientes Ativos"
                        valor={stats ? stats.clientesAtivos : '—'}
                        icone={<Users size={22} />}
                        cor="text-green-400"
                    />
                    <StatCard
                        rotulo="Receita do Mês"
                        valor={
                            stats
                                ? `R$ ${stats.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '—'
                        }
                        icone={<DollarSign size={22} />}
                        cor="text-yellow-400"
                    />
                </motion.div>

                {/* Link da página pública da barbearia */}
                <PaginaPublicaCard dominio={tenant.dominio} id={tenant.id} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Card de Trial (se em teste) */}
                    {trial.emTeste && trialConfig && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="lg:col-span-2"
                        >
                            <Card className={`p-5 sm:p-6 ${trialConfig.glow}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                                            <Sparkles size={22} className="text-yellow-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                Período de Teste
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${trialConfig.badge}`}>
                                                    <Clock size={10} />
                                                    {trial.diasRestantes} dias
                                                </span>
                                            </h3>
                                            <p className="text-sm text-zinc-400 mt-1">
                                                Você está aproveitando todas as funcionalidades sem restrições.
                                                {trial.urgencia === 'critical' || trial.urgencia === 'danger'
                                                    ? ' Assine para não perder seus dados!'
                                                    : ' Assine quando estiver pronto.'}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/planos"
                                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl 
                                            bg-yellow-400 text-zinc-900 font-bold text-sm
                                            hover:bg-yellow-300 active:scale-[0.98] transition-all duration-200
                                            shadow-[0_0_20px_rgba(250,204,21,0.15)]
                                            hover:shadow-[0_0_30px_rgba(250,204,21,0.25)]
                                            flex-shrink-0"
                                    >
                                        Ver Planos
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="flex-1 h-2 rounded-full bg-zinc-800/80 overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${trialConfig.progress}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${trial.percentualUsado}%` }}
                                            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                                        />
                                    </div>
                                    <span className="text-xs text-zinc-500 tabular-nums flex-shrink-0">
                                        {Math.round(trial.percentualUsado)}% usado
                                    </span>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Ações Rápidas */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <Card className="p-5 sm:p-6">
                            <h3 className="text-lg font-bold text-white mb-4 tracking-tight">
                                Ações Rápidas
                            </h3>
                            <div className="space-y-1.5">
                                {acoesRapidas.map(({ href, rotulo, icone: Icone }, i) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="flex items-center justify-between px-4 py-3 rounded-xl 
                                            bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-200 
                                            transition-all duration-200 group
                                            hover:shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icone
                                                size={18}
                                                className="text-yellow-400 group-hover:scale-110 transition-transform duration-200"
                                            />
                                            <span className="text-sm font-medium">{rotulo}</span>
                                        </span>
                                        <ChevronRight
                                            size={16}
                                            className="text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-200"
                                        />
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Informações da Conta */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <Card className="p-5 sm:p-6">
                            <h3 className="text-lg font-bold text-white mb-4 tracking-tight">
                                Informações da Conta
                            </h3>
                            <dl className="space-y-4 text-sm">
                                <div>
                                    <dt className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                                        Nome da Barbearia
                                    </dt>
                                    <dd className="text-white font-medium mt-0.5">{tenant.nome}</dd>
                                </div>
                                <div>
                                    <dt className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                                        Email
                                    </dt>
                                    <dd className="text-white font-medium mt-0.5">{tenant.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                                        Telefone
                                    </dt>
                                    <dd className="text-white font-medium mt-0.5">{tenant.telefone}</dd>
                                </div>
                                {tenant.endereco && (
                                    <div>
                                        <dt className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                                            Endereço
                                        </dt>
                                        <dd className="text-white font-medium mt-0.5">
                                            {tenant.endereco}
                                        </dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-1.5">
                                        Status
                                    </dt>
                                    <dd>
                                        <span
                                            className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                                                tenant.ativo
                                                    ? 'bg-green-500/15 text-green-400'
                                                    : 'bg-red-500/15 text-red-400'
                                            }`}
                                        >
                                            {tenant.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        </Card>
                    </motion.div>
                </div>
            </PainelMain>
        </PainelShell>
    )
}
