'use client'

import Link from 'next/link'

export default function IntegrationsPage() {
    const integrations = [
        {
            name: 'WhatsApp Business',
            description: 'Envie notificações automáticas e gerencie conversas com clientes',
            icon: '📱',
            features: [
                'Lembretes automáticos de agendamentos',
                'Confirmações de presença',
                'Mensagens pós-atendimento',
                'Chat integrado com clientes'
            ],
            status: 'available'
        },
        {
            name: 'Instagram',
            description: 'Conecte seu Instagram para gerenciar agendamentos e interações',
            icon: '📸',
            features: [
                'Agendamentos direto pelo Instagram',
                'Sincronização de stories',
                'Gerenciamento de comentários',
                'Análise de engajamento'
            ],
            status: 'available'
        },
        {
            name: 'Facebook',
            description: 'Integre sua página do Facebook para ampliar seu alcance',
            icon: '👥',
            features: [
                'Agendamentos via Facebook',
                'Sincronização de eventos',
                'Gerenciamento de reviews',
                'Campanhas de marketing'
            ],
            status: 'available'
        },
        {
            name: 'Google Calendar',
            description: 'Sincronize seus agendamentos com o Google Calendar',
            icon: '📅',
            features: [
                'Sincronização bidirecional',
                'Notificações automáticas',
                'Gerenciamento de horários',
                'Integração com outros apps'
            ],
            status: 'available'
        },
        {
            name: 'Stripe',
            description: 'Processe pagamentos online com segurança e facilidade',
            icon: '💳',
            features: [
                'Pagamentos online',
                'Cobrança recorrente',
                'Relatórios financeiros',
                'Integração com cartões'
            ],
            status: 'available'
        },
        {
            name: 'Mailchimp',
            description: 'Gerencie campanhas de email marketing para seus clientes',
            icon: '📧',
            features: [
                'Campanhas de email',
                'Segmentação de clientes',
                'Automação de marketing',
                'Análise de resultados'
            ],
            status: 'coming-soon'
        }
    ]

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'bg-green-100 text-green-800'
            case 'coming-soon':
                return 'bg-yellow-100 text-yellow-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'available':
                return 'Disponível'
            case 'coming-soon':
                return 'Em Breve'
            default:
                return 'Indisponível'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Integrações</h1>
                            <p className="text-gray-600">Conecte sua barbearia com as melhores ferramentas</p>
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
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Amplie o potencial da sua barbearia
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Conecte seu sistema com as principais plataformas e ferramentas 
                            para automatizar processos e melhorar a experiência dos clientes.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.map((integration, index) => (
                            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-3xl">{integration.icon}</span>
                                        <h3 className="text-xl font-bold text-gray-900">{integration.name}</h3>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                                        {getStatusText(integration.status)}
                                    </span>
                                </div>
                                
                                <p className="text-gray-600 mb-4">{integration.description}</p>
                                
                                <ul className="space-y-2 mb-6">
                                    {integration.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-start">
                                            <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm text-gray-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                
                                {integration.status === 'available' ? (
                                    <Link
                                        href="/register"
                                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-center block"
                                    >
                                        Conectar
                                    </Link>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md cursor-not-allowed"
                                    >
                                        Em Breve
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 bg-white shadow rounded-lg p-8">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Precisa de uma integração personalizada?
                            </h3>
                            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                                Nossa equipe de desenvolvimento pode criar integrações personalizadas 
                                para atender às necessidades específicas da sua barbearia.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/contact"
                                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Solicitar Integração
                                </Link>
                                <Link
                                    href="/docs"
                                    className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
                                >
                                    Ver Documentação
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
