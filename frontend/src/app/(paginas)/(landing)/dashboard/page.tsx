'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useAPI from '@/data/hooks/useAPI'

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

export default function DashboardPage() {
    const router = useRouter()
    const { httpGet } = useAPI()
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Buscar dados do tenant usando o hook useAPI que já envia o token
        httpGet('/tenants/me')
            .then(data => {
                setTenant(data)
            })
            .catch(err => {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Erro ao buscar dados do tenant:', err)
                }
                router.push('/login')
            })
            .finally(() => {
                setLoading(false)
            })

        // Estatísticas reais do dashboard
        httpGet('/tenants/me/stats')
            .then(data => setStats(data))
            .catch(() => setStats(null))
    }, [httpGet, router])

    const handleLogout = () => {
        router.push('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!tenant) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-600">Bem-vindo, {tenant.nome}!</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Agendamentos Hoje
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {stats ? stats.agendamentosHoje : '—'}
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
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Clientes Ativos
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {stats ? stats.clientesAtivos : '—'}
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
                                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Receita do Mês
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {stats
                                                    ? `R$ ${stats.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                    : '—'}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
                            <div className="space-y-3">
                                <Link
                                    href="/agendamentos"
                                    className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    Ver Agendamentos
                                </Link>
                                <Link
                                    href="/clientes"
                                    className="block w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                                >
                                    Gerenciar Clientes
                                </Link>
                                <Link
                                    href="/profissionais"
                                    className="block w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
                                >
                                    Gerenciar Profissionais
                                </Link>
                                <Link
                                    href="/servicos"
                                    className="block w-full text-left px-4 py-2 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors"
                                >
                                    Gerenciar Serviços
                                </Link>
                                <Link
                                    href="/assinatura"
                                    className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    Gerenciar Assinatura
                                </Link>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Conta</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nome da Barbearia</label>
                                    <p className="text-gray-900">{tenant.nome}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <p className="text-gray-900">{tenant.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                                    <p className="text-gray-900">{tenant.telefone}</p>
                                </div>
                                {tenant.endereco && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Endereço</label>
                                        <p className="text-gray-900">{tenant.endereco}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        tenant.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {tenant.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
