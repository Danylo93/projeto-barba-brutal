'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SystemStatus {
    status: 'operational' | 'degraded' | 'outage'
    message: string
    lastUpdated: string
}

interface ServiceStatus {
    name: string
    status: 'operational' | 'degraded' | 'outage'
    uptime: string
    responseTime: string
}

export default function StatusPage() {
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        status: 'operational',
        message: 'Todos os sistemas operando normalmente',
        lastUpdated: new Date().toISOString()
    })

    const [services, setServices] = useState<ServiceStatus[]>([
        {
            name: 'API Principal',
            status: 'operational',
            uptime: '99.9%',
            responseTime: '120ms'
        },
        {
            name: 'Sistema de Agendamentos',
            status: 'operational',
            uptime: '99.8%',
            responseTime: '95ms'
        },
        {
            name: 'Integração WhatsApp',
            status: 'operational',
            uptime: '99.7%',
            responseTime: '200ms'
        },
        {
            name: 'Sistema de Pagamentos',
            status: 'operational',
            uptime: '99.9%',
            responseTime: '150ms'
        },
        {
            name: 'Aplicativo Mobile',
            status: 'operational',
            uptime: '99.6%',
            responseTime: '180ms'
        },
        {
            name: 'Dashboard Web',
            status: 'operational',
            uptime: '99.8%',
            responseTime: '100ms'
        }
    ])

    const [incidents, setIncidents] = useState([
        {
            id: 1,
            title: 'Manutenção Programada - Sistema de Pagamentos',
            description: 'Realizaremos uma manutenção programada no sistema de pagamentos para melhorias de segurança.',
            status: 'scheduled',
            startDate: '2024-01-25T02:00:00Z',
            endDate: '2024-01-25T04:00:00Z',
            severity: 'low'
        }
    ])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'operational':
                return 'bg-green-100 text-green-800'
            case 'degraded':
                return 'bg-yellow-100 text-yellow-800'
            case 'outage':
                return 'bg-red-100 text-red-800'
            case 'scheduled':
                return 'bg-blue-100 text-blue-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'operational':
                return '✅'
            case 'degraded':
                return '⚠️'
            case 'outage':
                return '❌'
            case 'scheduled':
                return '📅'
            default:
                return '❓'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Status do Sistema</h1>
                            <p className="text-gray-600">Monitoramento em tempo real da nossa plataforma</p>
                        </div>
                        <Link
                            href="/"
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white shadow rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">Status Geral</h2>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(systemStatus.status)}`}>
                                        {getStatusIcon(systemStatus.status)} {systemStatus.status === 'operational' ? 'Operacional' : systemStatus.status === 'degraded' ? 'Degradado' : 'Fora do Ar'}
                                    </span>
                                </div>
                                <p className="text-gray-600 mb-4">{systemStatus.message}</p>
                                <p className="text-sm text-gray-500">
                                    Última atualização: {new Date(systemStatus.lastUpdated).toLocaleString('pt-BR')}
                                </p>
                            </div>

                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Status dos Serviços</h2>
                                <div className="space-y-4">
                                    {services.map((service, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-lg">{getStatusIcon(service.status)}</span>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        Uptime: {service.uptime} | Tempo de resposta: {service.responseTime}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                                                {service.status === 'operational' ? 'Operacional' : service.status === 'degraded' ? 'Degradado' : 'Fora do Ar'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Incidentes Recentes</h2>
                                {incidents.length > 0 ? (
                                    <div className="space-y-4">
                                        {incidents.map((incident) => (
                                            <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-medium text-gray-900">{incident.title}</h3>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                                                        {getStatusIcon(incident.status)} {incident.status === 'scheduled' ? 'Agendado' : incident.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    Início: {new Date(incident.startDate).toLocaleString('pt-BR')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Fim: {new Date(incident.endDate).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">Nenhum incidente reportado</p>
                                )}
                            </div>

                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Estatísticas</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Uptime Médio (30 dias)</span>
                                        <span className="font-medium text-gray-900">99.8%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Tempo de Resposta Médio</span>
                                        <span className="font-medium text-gray-900">140ms</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Incidentes (30 dias)</span>
                                        <span className="font-medium text-gray-900">0</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Tempo de Resolução Médio</span>
                                        <span className="font-medium text-gray-900">15min</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Notificações</h2>
                                <p className="text-gray-600 mb-4">
                                    Receba notificações sobre o status do sistema
                                </p>
                                <div className="space-y-3">
                                    <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                                        Inscrever-se no RSS
                                    </button>
                                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                                        Seguir no Twitter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
