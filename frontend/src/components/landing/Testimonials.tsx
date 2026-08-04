'use client';

import { motion } from 'framer-motion';
import { CalendarClock, ShieldCheck, Unlock } from 'lucide-react';

/*
 * Esta seção substituiu depoimentos inventados (nomes e barbearias que não
 * existem — risco de propaganda enganosa, CDC art. 37). A Barbearia Brutal
 * ainda não tem cliente disposto a dar depoimento público, então em vez de
 * simular prova social, assumimos isso e mostramos o que é verificável:
 * o que o sistema entrega e a garantia por trás do teste.
 */
const promessas = [
  {
    icon: CalendarClock,
    titulo: 'O que você recebe desde o dia 1',
    // Só o que está de pé hoje. O lembrete por WhatsApp depende de integração
    // que nem toda barbearia terá ligada no primeiro dia — prometer isso aqui
    // seria vender o que o produto pode não entregar.
    texto:
      'Agenda online 24h, cadastro de clientes, controle de comissão por barbeiro e relatório de faturamento — assim que você cadastra seus serviços.',
    cor: 'from-yellow-400 to-amber-500',
  },
  {
    icon: ShieldCheck,
    titulo: 'Teste de 30 dias',
    texto:
      'Você usa o sistema completo por um mês inteiro antes de decidir se continua.',
    cor: 'from-emerald-400 to-teal-500',
  },
  {
    icon: Unlock,
    titulo: 'Sem fidelidade, sem multa',
    texto:
      'Cancele quando quiser, direto pelo painel. Os dados da sua barbearia são seus — exporte quando precisar.',
    cor: 'from-amber-400 to-orange-500',
  },
];

export function Testimonials() {
  return (
    <section id="garantia" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-yellow-400 uppercase tracking-widest mb-3">
            Sem enrolação
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            Você não vai ver depoimento aqui
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            A Barbearia Brutal é um sistema novo. Em vez de inventar cliente satisfeito,
            mostramos exatamente o que você recebe — e o risco que você corre, que é zero.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {promessas.map((p, index) => (
            <motion.div
              key={p.titulo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="bg-zinc-950 rounded-2xl p-8 border border-zinc-800 transition-all duration-300 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
            >
              <div
                className={`w-11 h-11 rounded-full bg-gradient-to-br ${p.cor} flex items-center justify-center text-zinc-900 mb-5`}
              >
                <p.icon size={20} strokeWidth={2.5} />
              </div>

              <h3 className="font-semibold text-white text-lg mb-2">{p.titulo}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{p.texto}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
