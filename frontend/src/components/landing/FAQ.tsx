'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const perguntas = [
  {
    q: 'Como funciona o teste de 30 dias?',
    a: 'Você cria a conta, escolhe um plano e usa tudo liberado por 30 dias — sem cartão de crédito. Só paga (via Pix) se decidir continuar depois do teste.',
  },
  {
    q: 'Preciso de cartão de crédito para começar?',
    a: 'Não. O teste é 100% gratuito e o pagamento, quando você decidir assinar, é feito por Pix direto no painel.',
  },
  {
    q: 'Quantos barbeiros posso cadastrar?',
    a: 'Depende do plano: Básico permite 1 barbeiro, Profissional até 5 e Premium é ilimitado. Clientes são ilimitados em todos os planos.',
  },
  {
    q: 'Meus clientes pagam algo para agendar?',
    a: 'Não. Seus clientes criam conta e agendam gratuitamente, a qualquer hora, pelo link da sua barbearia.',
  },
  {
    q: 'Posso trocar de plano ou cancelar quando quiser?',
    a: 'Sim. Você faz upgrade ou downgrade a qualquer momento pelo painel, e pode cancelar sem multa nem fidelidade.',
  },
];

export function FAQ() {
  const [aberta, setAberta] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-zinc-950">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold text-yellow-400 uppercase tracking-widest mb-3">
            Dúvidas frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Perguntas e respostas
          </h2>
        </motion.div>

        <div className="space-y-3">
          {perguntas.map((item, i) => {
            const estaAberta = aberta === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`rounded-xl border transition-colors ${
                  estaAberta
                    ? 'border-yellow-400/40 bg-zinc-900'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                <button
                  onClick={() => setAberta(estaAberta ? null : i)}
                  aria-expanded={estaAberta}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-white">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-zinc-500 transition-transform duration-300 ${
                      estaAberta ? 'rotate-180 text-yellow-400' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {estaAberta && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
