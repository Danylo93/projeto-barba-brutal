'use client';

import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Básico',
    price: 'R$ 29,90',
    period: '/mês',
    description: 'Perfeito para barbearias pequenas',
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
    name: 'Profissional',
    price: 'R$ 59,90',
    period: '/mês',
    description: 'Ideal para barbearias em crescimento',
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
    name: 'Premium',
    price: 'R$ 99,90',
    period: '/mês',
    description: 'Para barbearias grandes e redes',
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
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Planos que cabem no seu bolso
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Escolha o plano ideal para sua barbearia. Sem compromisso, 
            cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border-2 p-8 ${
                plan.popular
                  ? 'border-blue-500 bg-white shadow-xl'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-1" />
                    Mais Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-slate-600 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    : ''
                }`}
                variant={plan.popular ? 'default' : 'outline'}
                asChild
              >
                <Link href="/register">Começar Agora</Link>
              </Button>
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
  );
}
