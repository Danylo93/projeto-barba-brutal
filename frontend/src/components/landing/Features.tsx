'use client';

import { Calendar, Users, BarChart3, Smartphone, Shield, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Calendar,
    title: 'Agendamentos Online',
    description: 'Sistema completo de agendamentos com confirmação automática e lembretes por WhatsApp.',
    benefits: ['Confirmação automática', 'Lembretes por WhatsApp', 'Calendário integrado'],
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Cadastro completo de clientes com histórico de serviços e preferências.',
    benefits: ['Histórico completo', 'Preferências salvas', 'Fidelidade de clientes'],
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Relatórios detalhados de vendas, clientes e performance dos profissionais.',
    benefits: ['Dashboard em tempo real', 'Métricas de performance', 'Análise de tendências'],
  },
  {
    icon: Smartphone,
    title: 'Funciona no celular',
    description: 'Sistema 100% responsivo: seus clientes agendam pelo celular a qualquer hora.',
    benefits: ['Sem instalar nada', 'Agendamento 24h', 'Interface intuitiva'],
  },
  {
    icon: Shield,
    title: 'Segurança Total',
    description: 'Seus dados protegidos com criptografia de ponta e backups automáticos.',
    benefits: ['Criptografia SSL', 'Backups automáticos', 'Conformidade LGPD'],
  },
  {
    icon: Zap,
    title: 'Integração WhatsApp',
    description: 'Integração completa com WhatsApp para confirmações e lembretes automáticos.',
    benefits: ['API oficial WhatsApp', 'Mensagens automáticas', 'Suporte 24/7'],
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px',
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4">
            Recursos Principais
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Tudo que sua barbearia precisa
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Uma plataforma completa com todas as ferramentas necessárias para 
            gerenciar e fazer crescer seu negócio.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center space-x-2 text-yellow-400">
            <span className="text-sm font-medium">E muito mais recursos chegando</span>
            <Zap className="h-4 w-4" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
