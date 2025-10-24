'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          Pronto para transformar sua barbearia?
        </h2>
        
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Junte-se a centenas de barbearias que já estão usando nosso sistema 
          para crescer e organizar seus negócios.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
            <Link href="/register">
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-blue-600">
            Falar com Vendas
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
            <div className="text-white font-semibold">14 dias grátis</div>
            <div className="text-blue-100 text-sm">Sem compromisso</div>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
            <div className="text-white font-semibold">Setup gratuito</div>
            <div className="text-blue-100 text-sm">Configuração incluída</div>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
            <div className="text-white font-semibold">Suporte 24/7</div>
            <div className="text-blue-100 text-sm">Sempre disponível</div>
          </div>
        </div>
      </div>
    </section>
  );
}
