'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const garantias = [
  { titulo: '30 dias grátis', sub: 'Sem cartão de crédito' },
  { titulo: 'Pagamento via Pix', sub: 'Direto no painel' },
  { titulo: 'Cancele quando quiser', sub: 'Sem multa nem fidelidade' },
];

export function CTA() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-zinc-950 overflow-hidden">
      {/* Glow central */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-yellow-400/[0.08] blur-[100px] rounded-full"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto text-center"
      >
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
          Pronto para lotar a agenda da{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
            sua barbearia?
          </span>
        </h2>

        <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
          Junte-se a centenas de barbearias que organizaram a gestão e não perdem
          mais nenhum horário.
        </p>

        <div className="flex justify-center mb-14">
          <Button
            size="lg"
            asChild
            className="text-lg px-10 py-7 group bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300
              active:scale-[0.98] transition-all rounded-xl
              shadow-[0_0_40px_rgba(250,204,21,0.25)] hover:shadow-[0_0_60px_rgba(250,204,21,0.35)]"
          >
            <Link href="/register">
              Começar grátis por 30 dias
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {garantias.map(({ titulo, sub }, i) => (
            <motion.div
              key={titulo}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="flex flex-col items-center"
            >
              <CheckCircle className="h-7 w-7 text-yellow-400 mb-2" />
              <div className="text-white font-semibold">{titulo}</div>
              <div className="text-zinc-500 text-sm">{sub}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
