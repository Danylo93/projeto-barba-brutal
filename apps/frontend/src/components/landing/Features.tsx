'use client';

import { Calendar, Users, BarChart3, Smartphone, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Agendamentos Online',
    description: 'Sistema completo de agendamentos com confirmação automática e lembretes por WhatsApp.',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Cadastro completo de clientes com histórico de serviços e preferências.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Relatórios detalhados de vendas, clientes e performance dos profissionais.',
  },
  {
    icon: Smartphone,
    title: 'App Mobile',
    description: 'Aplicativo mobile para clientes agendarem serviços a qualquer hora.',
  },
  {
    icon: Shield,
    title: 'Segurança Total',
    description: 'Seus dados protegidos com criptografia de ponta e backups automáticos.',
  },
  {
    icon: Zap,
    title: 'Integração WhatsApp',
    description: 'Integração completa com WhatsApp para confirmações e lembretes automáticos.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Tudo que sua barbearia precisa
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Uma plataforma completa com todas as ferramentas necessárias para 
            gerenciar e fazer crescer seu negócio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <span className="text-sm font-medium">E muito mais recursos chegando</span>
            <Zap className="h-4 w-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
