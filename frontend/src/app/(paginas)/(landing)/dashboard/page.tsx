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
} from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'
import {
    PainelShell,
    PainelHeader,
    PainelMain,
    Card,
    StatCard,
} from '@/components/painel/Painel'
import PainelNav from '@/components/painel/PainelNav'

interface Tenant {
    id: number
    nome: string
    email: string
    telefone: string
    endereco?: string
    cnpj?: string
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

export default function DashboardPage() {
    const router = useRouter()
    const { httpGet } = useAPI()
    const { carregando, token } = useSessao()
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                    <p className="mt-4 text-zinc-400">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!tenant) return null

    return (
        <PainelShell>
            <PainelNav />
            <PainelHeader
                titulo={`Olá, ${tenant.nome}`}
                descricao="Painel de gestão da sua barbearia"
            />

            <PainelMain>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
                        <div className="space-y-2">
                            {acoesRapidas.map(({ href, rotulo, icone: Icone }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 transition-colors group"
                                >
                                    <span className="flex items-center gap-3">
                                        <Icone size={18} className="text-yellow-400" />
                                        {rotulo}
                                    </span>
                                    <ChevronRight
                                        size={18}
                                        className="text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all"
                                    />
                                </Link>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Informações da Conta</h3>
                        <dl className="space-y-4 text-sm">
                            <div>
                                <dt className="text-zinc-500">Nome da Barbearia</dt>
                                <dd className="text-white">{tenant.nome}</dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Email</dt>
                                <dd className="text-white">{tenant.email}</dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Telefone</dt>
                                <dd className="text-white">{tenant.telefone}</dd>
                            </div>
                            {tenant.endereco && (
                                <div>
                                    <dt className="text-zinc-500">Endereço</dt>
                                    <dd className="text-white">{tenant.endereco}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-zinc-500 mb-1">Status</dt>
                                <dd>
                                    <span
                                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
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
                </div>
            </PainelMain>
        </PainelShell>
    )
}
