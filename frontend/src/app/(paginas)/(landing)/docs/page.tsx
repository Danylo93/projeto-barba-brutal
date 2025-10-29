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
        { id: 'examples', label: 'Exemplos', icon: '💡' },
        { id: 'troubleshooting', label: 'Solução de Problemas', icon: '🔍' },
    ]

    const docs = {
        'getting-started': [
            {
                title: 'Configuração Inicial',
                content: `
                    <h3>1. Criação da Conta</h3>
                    <p>Para começar, você precisa criar uma conta no nosso sistema:</p>
                    <ol>
                        <li>Acesse a página de registro</li>
                        <li>Preencha as informações da sua barbearia</li>
                        <li>Confirme seu email</li>
                        <li>Faça login no painel administrativo</li>
                    </ol>
                    
                    <h3>2. Configuração dos Profissionais</h3>
                    <p>Após criar sua conta, configure seus profissionais:</p>
                    <ol>
                        <li>Vá em Profissionais > Novo Profissional</li>
                        <li>Preencha as informações básicas</li>
                        <li>Defina as especialidades de cada profissional</li>
                        <li>Configure os horários de trabalho</li>
                    </ol>
                    
                    <h3>3. Cadastro dos Serviços</h3>
                    <p>Cadastre os serviços oferecidos pela sua barbearia:</p>
                    <ol>
                        <li>Vá em Serviços > Novo Serviço</li>
                        <li>Defina nome, preço e duração</li>
                        <li>Adicione descrição e fotos</li>
                        <li>Configure disponibilidade por profissional</li>
                    </ol>
                `
            }
        ],
        'api': [
            {
                title: 'Autenticação',
                content: `
                    <p>Nossa API usa autenticação baseada em JWT. Para autenticar suas requisições:</p>
                    <pre><code>Authorization: Bearer YOUR_JWT_TOKEN</code></pre>
                    
                    <h3>Endpoints Principais</h3>
                    <ul>
                        <li><code>GET /api/agendamentos</code> - Listar agendamentos</li>
                        <li><code>POST /api/agendamentos</code> - Criar agendamento</li>
                        <li><code>GET /api/clientes</code> - Listar clientes</li>
                        <li><code>POST /api/clientes</code> - Criar cliente</li>
                        <li><code>GET /api/profissionais</code> - Listar profissionais</li>
                        <li><code>GET /api/servicos</code> - Listar serviços</li>
                    </ul>
                `
            }
        ],
        'integrations': [
            {
                title: 'WhatsApp Business API',
                content: `
                    <p>Integre seu WhatsApp Business para enviar notificações automáticas:</p>
                    <ol>
                        <li>Vá em Configurações > Integrações > WhatsApp</li>
                        <li>Conecte sua conta do WhatsApp Business</li>
                        <li>Configure as mensagens de notificação</li>
                        <li>Ative os lembretes automáticos</li>
                    </ol>
                    
                    <h3>Mensagens Disponíveis</h3>
                    <ul>
                        <li>Confirmação de agendamento</li>
                        <li>Lembrete 24h antes</li>
                        <li>Lembrete 1h antes</li>
                        <li>Confirmação de presença</li>
                        <li>Pós-atendimento</li>
                    </ul>
                `
            }
        ],
        'webhooks': [
            {
                title: 'Configuração de Webhooks',
                content: `
                    <p>Configure webhooks para receber notificações em tempo real:</p>
                    <ol>
                        <li>Vá em Configurações > Webhooks</li>
                        <li>Adicione a URL do seu endpoint</li>
                        <li>Selecione os eventos que deseja receber</li>
                        <li>Configure a assinatura de segurança</li>
                    </ol>
                    
                    <h3>Eventos Disponíveis</h3>
                    <ul>
                        <li><code>agendamento.criado</code> - Novo agendamento</li>
                        <li><code>agendamento.confirmado</code> - Agendamento confirmado</li>
                        <li><code>agendamento.cancelado</code> - Agendamento cancelado</li>
                        <li><code>cliente.criado</code> - Novo cliente</li>
                        <li><code>pagamento.processado</code> - Pagamento processado</li>
                    </ul>
                `
            }
        ],
        'examples': [
            {
                title: 'Exemplos de Uso',
                content: `
                    <h3>Criar Agendamento via API</h3>
                    <pre><code>curl -X POST https://api.barbabrutal.com/agendamentos \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cliente": {
      "nome": "João Silva",
      "telefone": "11999999999",
      "email": "joao@email.com"
    },
    "profissional": 1,
    "servicos": [1, 2],
    "data": "2024-01-25T14:00:00Z",
    "observacoes": "Primeira vez"
  }'</code></pre>
                    
                    <h3>Integração com Site</h3>
                    <pre><code>&lt;script src="https://widget.barbabrutal.com/agendamento.js"&gt;&lt;/script&gt;
&lt;div id="barbabrutal-widget" data-tenant="seu-tenant-id"&gt;&lt;/div&gt;</code></pre>
                `
            }
        ],
        'troubleshooting': [
            {
                title: 'Problemas Comuns',
                content: `
                    <h3>Problema: Agendamentos não aparecem</h3>
                    <p><strong>Solução:</strong> Verifique se o profissional está ativo e se os horários estão configurados corretamente.</p>
                    
                    <h3>Problema: WhatsApp não envia mensagens</h3>
                    <p><strong>Solução:</strong> Verifique se a integração está ativa e se o número está cadastrado corretamente.</p>
                    
                    <h3>Problema: Erro 401 - Não autorizado</h3>
                    <p><strong>Solução:</strong> Verifique se o token JWT está válido e se não expirou.</p>
                    
                    <h3>Problema: Erro 429 - Muitas requisições</h3>
                    <p><strong>Solução:</strong> Implemente rate limiting nas suas requisições para a API.</p>
                `
            }
        ]
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Documentação</h1>
                            <p className="text-gray-600">Guia completo para desenvolvedores</p>
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
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                            activeSection === section.id
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                            {doc.title}
                                        </h2>
                                        <div 
                                            className="prose max-w-none"
                                            dangerouslySetInnerHTML={{ __html: doc.content }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Precisa de mais ajuda?
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
                                href="/help"
                                className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors text-center"
                            >
                                Central de Ajuda
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
