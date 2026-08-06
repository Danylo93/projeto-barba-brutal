'use client'

import { Button } from '@/components/ui/button'
import { Check, Star } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Básico',
    price: 'R$ 49,90',
    period: '/mês',
    description: 'Ideal para começar com agenda, clientes e operação essencial',
    features: ['1 barbeiro', 'Agenda online', 'Cadastro de clientes', 'Relatórios básicos'],
    popular: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 99,90',
    period: '/mês',
    description: 'Para barbearias que já precisam de equipe e automação',
    features: ['Até 5 barbeiros', 'Agenda online', 'Integração WhatsApp', 'Comissões da equipe'],
    popular: true,
  },
  {
    name: 'Premium',
    price: 'R$ 159,90',
    period: '/mês',
    description: 'Para quem quer operação completa com automação e relatórios avançados',
    features: ['Barbeiros ilimitados', 'Agendamentos ilimitados', 'Relatórios completos', 'Robô de WhatsApp (IA)'],
    popular: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-gradient-to-b from-zinc-950 to-background px-4 py-20 sm:px-6 lg:px-8">
      <div className="absolute inset-0 z-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM60 91c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM35 41c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 60c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z")',
            backgroundSize: '200px 200px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Planos claros para a operação real</h2>
          <p className="mx-auto max-w-3xl text-xl text-zinc-400">
            Os planos refletem exatamente o que a plataforma libera hoje: Básico para começar, Profissional para equipe e integração, Premium para automação e relatórios avançados.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              style={{ animationDelay: `${index * 0.1}s` }}
              className={`relative rounded-2xl border-2 p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                plan.popular
                  ? 'border-yellow-400 bg-zinc-900 shadow-xl hover:shadow-[0_12px_40px_rgba(250,204,21,0.12)]'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/40'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <div className="flex items-center rounded-full bg-yellow-400 px-4 py-2 text-sm font-medium text-zinc-900">
                    <Star className="mr-1 h-4 w-4" />
                    Mais escolhido
                  </div>
                </div>
              )}

              <div className="mb-8 text-center">
                <h3 className="mb-2 text-2xl font-bold text-white">{plan.name}</h3>
                <p className="mb-4 text-zinc-400">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="ml-1 text-zinc-400">{plan.period}</span>
                </div>
              </div>

              <ul className="mb-8 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-zinc-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${plan.popular ? 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
                asChild
              >
                <Link href={`/register?plano=${plan.name.toLowerCase()}`}>Começar agora</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-zinc-400">
            Todos os planos incluem <span className="font-semibold text-yellow-400">30 dias grátis</span> · pagamento via Pix
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-500">
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
