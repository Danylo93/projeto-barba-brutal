'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'João Silva',
    role: 'Proprietário da Barbearia Moderna',
    content:
      'O sistema revolucionou minha barbearia. Agora consigo gerenciar tudo de forma organizada e os clientes adoram a facilidade de agendar pelo celular.',
    rating: 5,
    cor: 'from-yellow-400 to-amber-500',
  },
  {
    name: 'Maria Santos',
    role: 'Gerente da Barbearia Elite',
    content:
      'Os relatórios me ajudam muito a entender o que está funcionando. Aumentei 40% nas vendas depois que comecei a usar o sistema.',
    rating: 5,
    cor: 'from-emerald-400 to-teal-500',
  },
  {
    name: 'Carlos Oliveira',
    role: 'Proprietário da Barbearia Clássica',
    content:
      'A integração com WhatsApp é fantástica. Os clientes recebem lembretes automáticos e isso reduziu muito as faltas.',
    rating: 5,
    cor: 'from-amber-400 to-orange-500',
  },
];

function iniciais(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-yellow-400 uppercase tracking-widest mb-3">
            Depoimentos
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            Quem usa, recomenda
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            Donos de barbearia que transformaram a gestão do negócio.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="bg-zinc-950 rounded-2xl p-8 border border-zinc-800 transition-all duration-300 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
            >
              <div className="flex items-center mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>

              <blockquote className="text-zinc-300 mb-6">
                &ldquo;{t.content}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.cor} flex items-center justify-center text-zinc-900 font-black text-sm`}
                >
                  {iniciais(t.name)}
                </div>
                <div>
                  <div className="font-semibold text-white">{t.name}</div>
                  <div className="text-zinc-400 text-sm">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
