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
        { id: 'integrations', label: 'Integrações', icon: '🔗' },
        { id: 'billing', label: 'Cobrança', icon: '💳' },
    ]

    const faqs = {
        'getting-started': [
            { question: 'Como começo a usar?', answer: 'Crie a conta, configure os horários, cadastre serviços e profissionais, e depois conecte as integrações se o seu plano permitir.' },
            { question: 'A demo é real?', answer: 'Sim. A demo mostra o fluxo e os dados de exemplo de forma parecida com o que o sistema entrega hoje.' },
            { question: 'O que muda por plano?', answer: 'O Básico libera o essencial, o Profissional adiciona equipe e integrações, e o Premium libera automações e relatórios avançados.' },
        ],
        'agendamentos': [
            { question: 'Como funcionam os agendamentos?', answer: 'O cliente agenda online ou via WhatsApp, o sistema grava o horário e dispara as mensagens de confirmação quando configurado.' },
            { question: 'Posso reagendar ou cancelar?', answer: 'Sim. O fluxo de WhatsApp e o painel atualizam o agendamento no sistema quando a ação é confirmada.' },
            { question: 'Tem lembrete automático?', answer: 'Sim, quando a integração de mensagens está ativa o sistema pode enviar lembretes e confirmações.' },
        ],
        'clientes': [
            { question: 'Como vejo o histórico?', answer: 'Cada cliente fica com histórico de agendamentos e dados principais dentro do cadastro.' },
            { question: 'Os clientes entram sozinhos?', answer: 'Sim, quando o agendamento é criado pelo fluxo do sistema o cliente pode ser registrado automaticamente.' },
            { question: 'Posso usar isso no atendimento pelo WhatsApp?', answer: 'Sim. O fluxo conversa com o cliente e atualiza o sistema quando ele pede agendar, cancelar ou reagendar.' },
        ],
        'profissionais': [
            { question: 'Quantos profissionais posso cadastrar?', answer: 'Depende do plano: Básico, Profissional e Premium têm limites diferentes e o painel respeita isso.' },
            { question: 'Cada profissional vê sua agenda?', answer: 'Sim, o perfil do barbeiro acessa a própria agenda quando vinculado corretamente.' },
            { question: 'Posso controlar comissão?', answer: 'Sim, a área financeira mostra comissões da equipe nos planos que liberam essa função.' },
        ],
        'servicos': [
            { question: 'Como cadastro serviços?', answer: 'No painel interno, crie o serviço com nome, preço e duração para ele entrar no agendamento.' },
            { question: 'Posso alterar preço depois?', answer: 'Sim, mas mudanças só afetam novos agendamentos.' },
            { question: 'Os serviços aparecem no fluxo do WhatsApp?', answer: 'Sim, o robô pode consultar catálogo de serviços para montar o agendamento.' },
        ],
        'integrations': [
            { question: 'Quais integrações existem hoje?', answer: 'O fluxo usa WhatsApp, Evolution API, n8n e backend para enviar, receber e atualizar os agendamentos.' },
            { question: 'Como ativo no painel?', answer: 'No plano compatível, vá em Configurações > Integrações e preencha a URL do webhook, token e instance.' },
            { question: 'O Básico libera isso?', answer: 'Não. As integrações ficam bloqueadas no Básico e aparecem como upgrade.' },
        ],
        'billing': [
            { question: 'Como funciona a cobrança?', answer: 'Os planos são mensais e podem ser alterados pela tela de assinatura.' },
            { question: 'Posso fazer upgrade depois?', answer: 'Pode. O sistema mostra botões de upgrade onde faz sentido.' },
            { question: 'Recebo aviso quando muda o plano?', answer: 'Sim, as alterações de plano podem gerar notificação por WhatsApp e email.' },
        ],
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Central de Ajuda</h1>
                            <p className="text-gray-600">Respostas alinhadas com o funcionamento atual do sistema</p>
                        </div>
                        <Link href="/" className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700">
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 overflow-x-auto px-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                                        activeTab === tab.id
                                            ? 'border-green-500 text-green-600'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
                                    <h3 className="mb-2 text-lg font-medium text-gray-900">{faq.question}</h3>
                                    <p className="text-gray-600">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-medium text-gray-900">Ainda precisa de ajuda?</h3>
                    <p className="mb-4 text-gray-600">
                        Se quiser confirmar se um recurso está no seu plano ou entender o fluxo real do WhatsApp, a central de ajuda e a tela de planos mostram a regra atual.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Link href="/contact" className="rounded-md bg-green-600 px-6 py-3 text-center text-white transition-colors hover:bg-green-700">
                            Entrar em Contato
                        </Link>
                        <Link href="/demo" className="rounded-md bg-gray-600 px-6 py-3 text-center text-white transition-colors hover:bg-gray-700">
                            Ver Demonstração
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
