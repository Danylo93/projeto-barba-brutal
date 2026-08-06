'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('getting-started')

    const sections = [
        { id: 'getting-started', label: 'Primeiros Passos', icon: '🚀' },
        { id: 'api', label: 'API', icon: '🔧' },
        { id: 'integrations', label: 'Integrações', icon: '🔗' },
        { id: 'webhooks', label: 'Webhooks', icon: '🪝' },
        { id: 'troubleshooting', label: 'Problemas', icon: '🔍' },
    ]

    const docs = {
        'getting-started': [
            {
                title: 'Configuração inicial',
                content: `
                    <h3>1. Crie a conta</h3>
                    <p>Após o cadastro, entre no painel e complete os dados da barbearia.</p>
                    <h3>2. Configure o básico</h3>
                    <p>Cadastre horários, serviços, profissionais e dados de contato.</p>
                    <h3>3. Conecte integrações se o plano permitir</h3>
                    <p>Os campos de WhatsApp, n8n e Evolution API ficam liberados somente nos planos compatíveis.</p>
                `
            }
        ],
        'api': [
            {
                title: 'Autenticação e uso',
                content: `
                    <p>A API usa autenticação com token do usuário e rotas internas do sistema para operações administrativas.</p>
                    <ul>
                        <li>Buscar dados da barbearia: <code>GET /tenants/me</code></li>
                        <li>Salvar configurações: <code>PUT /tenants/me/configuracoes</code></li>
                        <li>Consultar agenda, clientes e serviços: rotas internas do backend</li>
                    </ul>
                `
            }
        ],
        'integrations': [
            {
                title: 'WhatsApp, Evolution e n8n',
                content: `
                    <p>O fluxo real envia eventos para o n8n e recebe mensagens da Evolution API.</p>
                    <ol>
                        <li>Configure a URL do webhook no painel.</li>
                        <li>Informe o token e a instance da Evolution API quando o plano permitir.</li>
                        <li>Ative o fluxo no n8n para receber mensagens e processar agendamentos.</li>
                    </ol>
                    <p>O robô pode identificar pedidos de agendar, reagendar, cancelar e responder com o nome da barbearia.</p>
                `
            }
        ],
        'webhooks': [
            {
                title: 'Eventos reais do fluxo',
                content: `
                    <p>O webhook da Evolution dispara eventos como mensagens recebidas e atualizações de status.</p>
                    <ul>
                        <li><code>messages.upsert</code> para novas mensagens</li>
                        <li><code>messages.update</code> para mudanças de status</li>
                        <li><code>qrcode.updated</code> para status da conexão</li>
                    </ul>
                `
            }
        ],
        'troubleshooting': [
            {
                title: 'Problemas comuns',
                content: `
                    <h3>WhatsApp não respondeu</h3>
                    <p>Verifique se a Evolution API está conectada, se o webhook do n8n está em modo ativo e se o plano libera a integração.</p>
                    <h3>Integração não aparece</h3>
                    <p>No plano Básico, a área de integrações é bloqueada por design.</p>
                    <h3>Agendamento não atualizou</h3>
                    <p>Confirme se o fluxo do n8n chamou o backend e se o tenant da barbearia foi resolvido corretamente.</p>
                `
            }
        ]
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Documentação</h1>
                            <p className="text-gray-600">Guia alinhado com o funcionamento atual do sistema</p>
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
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                                        activeSection === section.id
                                            ? 'border-green-500 text-green-600'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    <span className="mr-2">{section.icon}</span>
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        <div className="space-y-6">
                            {docs[activeSection as keyof typeof docs]?.map((doc, index) => (
                                <div key={index} className="border-b border-gray-200 pb-6">
                                    <h2 className="mb-4 text-2xl font-bold text-gray-900">{doc.title}</h2>
                                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: doc.content }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-medium text-gray-900">Quer ir para a prática?</h3>
                    <p className="mb-4 text-gray-600">
                        Use a demo para entender o fluxo e o painel para testar os recursos que já estão ativos no seu plano.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Link href="/demo" className="rounded-md bg-green-600 px-6 py-3 text-center text-white transition-colors hover:bg-green-700">
                            Ver Demonstração
                        </Link>
                        <Link href="/help" className="rounded-md bg-gray-600 px-6 py-3 text-center text-white transition-colors hover:bg-gray-700">
                            Central de Ajuda
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
