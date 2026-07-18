'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('getting-started')

    const tabs = [
        { id: 'getting-started', label: 'Primeiros Passos', icon: '🚀' },
        { id: 'agendamentos', label: 'Agendamentos', icon: '📅' },
        { id: 'clientes', label: 'Clientes', icon: '👥' },
        { id: 'profissionais', label: 'Profissionais', icon: '💇' },
        { id: 'servicos', label: 'Serviços', icon: '✂️' },
        { id: 'relatorios', label: 'Relatórios', icon: '📊' },
        { id: 'integrations', label: 'Integrações', icon: '🔗' },
        { id: 'billing', label: 'Cobrança', icon: '💳' },
    ]

    const faqs = {
        'getting-started': [
            {
                question: 'Como começar a usar o sistema?',
                answer: 'Após criar sua conta, você receberá um email de boas-vindas com instruções detalhadas. O primeiro passo é configurar seus profissionais e serviços.'
            },
            {
                question: 'Preciso de treinamento para usar o sistema?',
                answer: 'Não! Nosso sistema foi desenvolvido para ser intuitivo. Oferecemos tutoriais em vídeo e documentação completa para ajudá-lo a começar.'
            },
            {
                question: 'Como faço para migrar meus dados atuais?',
                answer: 'Nossa equipe de suporte pode ajudá-lo a migrar seus dados existentes. Entre em contato conosco para agendar uma consulta gratuita.'
            }
        ],
        'agendamentos': [
            {
                question: 'Como funcionam os agendamentos online?',
                answer: 'Seus clientes podem agendar serviços diretamente pelo seu site ou app. Eles recebem confirmações automáticas por email e WhatsApp.'
            },
            {
                question: 'Posso bloquear horários específicos?',
                answer: 'Sim! Você pode bloquear horários para pausas, manutenção ou eventos especiais através do painel administrativo.'
            },
            {
                question: 'Como funciona o sistema de lembretes?',
                answer: 'Enviamos lembretes automáticos 24h e 1h antes do agendamento via WhatsApp e email para reduzir faltas.'
            }
        ],
        'clientes': [
            {
                question: 'Como gerencio minha base de clientes?',
                answer: 'Você pode cadastrar clientes manualmente ou eles se cadastram automaticamente ao fazer agendamentos. Todos os dados ficam organizados em um só lugar.'
            },
            {
                question: 'Posso ver o histórico de cada cliente?',
                answer: 'Sim! Para cada cliente você pode ver todos os agendamentos, serviços realizados, preferências e observações importantes.'
            },
            {
                question: 'Como funciona o sistema de fidelidade?',
                answer: 'Você pode configurar programas de fidelidade personalizados, como desconto a cada 5 cortes ou brinde especial para aniversariantes.'
            }
        ],
        'profissionais': [
            {
                question: 'Como cadastro meus profissionais?',
                answer: 'No painel administrativo, vá em Profissionais > Novo Profissional e preencha as informações básicas. Cada profissional terá seu próprio perfil.'
            },
            {
                question: 'Posso definir especialidades para cada profissional?',
                answer: 'Sim! Você pode definir quais serviços cada profissional oferece e até mesmo criar pacotes exclusivos para cada um.'
            },
            {
                question: 'Como funciona o sistema de avaliações?',
                answer: 'Após cada serviço, os clientes podem avaliar o profissional. As avaliações ficam visíveis no perfil de cada profissional.'
            }
        ],
        'servicos': [
            {
                question: 'Como cadastro meus serviços?',
                answer: 'No painel administrativo, vá em Serviços > Novo Serviço. Defina nome, preço, duração e descrição. Você pode também adicionar fotos.'
            },
            {
                question: 'Posso criar pacotes de serviços?',
                answer: 'Sim! Você pode criar combos como "Corte + Barba + Sobrancelha" com preço especial e duração total dos serviços.'
            },
            {
                question: 'Como gerencio os preços?',
                answer: 'Você pode ajustar preços a qualquer momento. As mudanças se aplicam apenas a novos agendamentos, não aos já confirmados.'
            }
        ],
        'relatorios': [
            {
                question: 'Que tipos de relatórios posso gerar?',
                answer: 'Relatórios de vendas, clientes mais frequentes, performance dos profissionais, horários mais movimentados, receita por período e muito mais.'
            },
            {
                question: 'Posso exportar os relatórios?',
                answer: 'Sim! Todos os relatórios podem ser exportados em PDF ou Excel para análise offline ou apresentações.'
            },
            {
                question: 'Os relatórios são atualizados em tempo real?',
                answer: 'Sim! Todos os dados são atualizados automaticamente conforme novos agendamentos e serviços são realizados.'
            }
        ],
        'integrations': [
            {
                question: 'Quais integrações estão disponíveis?',
                answer: 'WhatsApp, Instagram, Facebook, Google Calendar, sistema de pagamentos e muito mais. Novas integrações são adicionadas regularmente.'
            },
            {
                question: 'Como configuro a integração com WhatsApp?',
                answer: 'No painel administrativo, vá em Configurações > Integrações > WhatsApp e siga as instruções para conectar sua conta.'
            },
            {
                question: 'Posso integrar com meu site atual?',
                answer: 'Sim! Oferecemos widgets e APIs para integrar o sistema de agendamentos ao seu site existente.'
            }
        ],
        'billing': [
            {
                question: 'Como funciona o sistema de cobrança?',
                answer: 'Cobramos mensalmente através do Stripe. Você pode escolher entre diferentes planos conforme suas necessidades.'
            },
            {
                question: 'Posso cancelar a qualquer momento?',
                answer: 'Sim! Não há fidelidade. Você pode cancelar a qualquer momento e continuar usando o sistema até o final do período pago.'
            },
            {
                question: 'O que acontece se eu exceder os limites do meu plano?',
                answer: 'Você será notificado quando se aproximar dos limites. Pode fazer upgrade do plano a qualquer momento para continuar sem interrupções.'
            }
        ]
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Central de Ajuda</h1>
                            <p className="text-gray-600">Encontre respostas para suas dúvidas</p>
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
                    <div className="bg-white shadow rounded-lg">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                            activeTab === tab.id
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-6">
                            <div className="space-y-6">
                                {faqs[activeTab as keyof typeof faqs]?.map((faq, index) => (
                                    <div key={index} className="border-b border-gray-200 pb-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {faq.question}
                                        </h3>
                                        <p className="text-gray-600">
                                            {faq.answer}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Ainda precisa de ajuda?
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Nossa equipe de suporte está sempre pronta para ajudá-lo!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                href="/contact"
                                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors text-center"
                            >
                                Entrar em Contato
                            </Link>
                            <Link
                                href="/demo"
                                className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors text-center"
                            >
                                Agendar Demonstração
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
