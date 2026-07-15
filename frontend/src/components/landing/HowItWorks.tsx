'use client';

import { motion } from 'framer-motion';
import { Store, Scissors, Share2 } from 'lucide-react';

const passos = [
  {
    icone: Store,
    titulo: 'Cadastre sua barbearia',
    descricao: 'Crie sua conta em 2 minutos. Sem cartão de crédito, sem burocracia.',
  },
  {
    icone: Scissors,
    titulo: 'Monte serviços e equipe',
    descricao: 'Adicione seus barbeiros, serviços, preços e horários de atendimento.',
  },
  {
    icone: Share2,
    titulo: 'Receba agendamentos',
    descricao: 'Seus clientes agendam online 24h e você acompanha tudo pelo painel.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-yellow-400 uppercase tracking-widest mb-3">
            Como funciona
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            No ar em 3 passos
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Do cadastro ao primeiro agendamento no mesmo dia.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {/* Linha conectando os passos (desktop) */}
          <div
            className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent"
            aria-hidden
          />

          {passos.map(({ icone: Icone, titulo, descricao }, i) => (
            <motion.div
              key={titulo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 shadow-lg shadow-black/40">
                <Icone size={26} className="text-yellow-400" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-400 text-zinc-900 text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{titulo}</h3>
              <p className="text-sm text-zinc-400 max-w-xs">{descricao}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
