'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6">
            Transforme sua{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              barbearia
            </span>{' '}
            em um negócio digital
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Sistema completo de gestão para barbearias. Agendamentos online, 
            gestão de clientes, relatórios e muito mais em uma única plataforma.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <Link href="/register">
                Começar Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              <Play className="mr-2 h-5 w-5" />
              Ver Demonstração
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">500+</div>
              <div className="text-slate-600">Barbearias Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">50K+</div>
              <div className="text-slate-600">Agendamentos/Mês</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">99.9%</div>
              <div className="text-slate-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">4.9/5</div>
              <div className="text-slate-600">Avaliação</div>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <div className="relative rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-8 border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl"></div>
            <div className="relative">
              <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                Veja o sistema em ação
              </h3>
              <div className="aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Demonstração do Sistema</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
