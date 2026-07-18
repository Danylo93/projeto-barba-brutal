'use client'
import Link from 'next/link'

const planos = [
    {
        nome: 'Básico',
        preco: 'R$ 29,90',
        periodo: '/mês',
        descricao: 'Perfeito para barbearias pequenas',
        features: [
            'Até 5 usuários',
            'Até 100 agendamentos/mês',
            'Gestão de clientes',
            'Relatórios básicos',
            'Suporte por email',
        ],
        popular: false,
    },
    {
        nome: 'Profissional',
        preco: 'R$ 59,90',
        periodo: '/mês',
        descricao: 'Ideal para barbearias em crescimento',
        features: [
            'Até 15 usuários',
            'Até 500 agendamentos/mês',
            'Gestão de clientes',
            'Relatórios avançados',
            'Integração WhatsApp',
            'Marketing digital',
            'Suporte prioritário',
        ],
        popular: true,
    },
    {
        nome: 'Premium',
        preco: 'R$ 99,90',
        periodo: '/mês',
        descricao: 'Para barbearias grandes e redes',
        features: [
            'Até 50 usuários',
            'Agendamentos ilimitados',
            'Gestão de clientes',
            'Relatórios avançados',
            'Integração WhatsApp',
            'Marketing digital',
            'API personalizada',
            'Suporte prioritário 24/7',
        ],
        popular: false,
    },
]

export default function PlanosPrecos() {
    return (
        <section id="pricing" className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-slate-900 mb-4">
                        Planos que cabem no seu bolso
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        Escolha o plano ideal para sua barbearia. Sem compromisso, 
                        cancele quando quiser.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {planos.map((plano, index) => (
                        <div
                            key={index}
                            className={`relative rounded-2xl border-2 p-8 ${
                                plano.popular
                                    ? 'border-green-500 bg-white shadow-xl scale-105'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            {plano.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                                        Mais Popular
                                    </div>
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                    {plano.nome}
                                </h3>
                                <p className="text-slate-600 mb-4">{plano.descricao}</p>
                                <div className="flex items-baseline justify-center">
                                    <span className="text-4xl font-bold text-slate-900">
                                        {plano.preco}
                                    </span>
                                    <span className="text-slate-600 ml-1">{plano.periodo}</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plano.features.map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-start">
                                        <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-slate-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={`/checkout?planoId=${index + 1}&tenantId=1`}
                                className={`w-full block text-center py-3 px-6 rounded-md font-semibold transition-all duration-300 ${
                                    plano.popular
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                            >
                                Assinar {plano.nome}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <p className="text-slate-600 mb-4">
                        Todos os planos incluem teste gratuito de 14 dias
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
                        <span>✓ Sem taxa de instalação</span>
                        <span>✓ Cancelamento a qualquer momento</span>
                        <span>✓ Migração de dados gratuita</span>
                        <span>✓ Suporte técnico incluso</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
