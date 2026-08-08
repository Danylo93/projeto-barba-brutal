'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
 * Esta é a única diferença que realmente separa a Barbearia Brutal do resto
 * do mercado: os concorrentes automatizam mensagem (lembrete, confirmação,
 * aniversário — texto pronto, disparado na hora certa). O nosso conversa:
 * entende o que o cliente escreve e resolve — marca, remarca, cancela,
 * cadastra gente nova. Por isso a seção mostra a conversa em vez de
 * descrever a diferença com adjetivo.
 */
const capacidades = [
  'Marca, remarca, cancela e mostra os horários já agendados — tudo na conversa, sem o cliente abrir o site.',
  'Cliente novo? Ele pede nome e e-mail e manda o link de primeiro acesso por e-mail, sem você cadastrar ninguém.',
  'Sabe de cor o cardápio de serviços, quem atende o quê e o expediente da barbearia.',
  'Sempre no horário de Brasília — com a hora que o cliente realmente vai chegar.',
];

const conversa = [
  { de: 'cliente', texto: 'Oi! quero cortar sábado de manhã, tem vaga?', hora: '10:32' },
  { de: 'bot', texto: 'Oi! Sábado (dia 15) tem 9h ou 10h30 com o Marcão, corte é 45. Qual fica melhor pra você?', hora: '10:32' },
  { de: 'cliente', texto: '10h30 pode ser', hora: '10:33' },
  { de: 'bot', texto: 'Fechado! Corte com o Marcão, sábado 15/08 às 10h30. Te aviso 1h antes.', hora: '10:33' },
];

function ConversaWhatsApp() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto w-full max-w-sm"
    >
      <div className="absolute -inset-6 bg-yellow-400/10 blur-3xl rounded-full" aria-hidden />

      <div className="relative rounded-[2rem] border-8 border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Cabeçalho simulando o app do WhatsApp */}
        <div className="flex items-center gap-3 bg-zinc-900 px-4 py-3 border-b border-zinc-800">
          <div className="h-9 w-9 rounded-full bg-yellow-400 flex items-center justify-center text-zinc-900 font-black text-sm flex-shrink-0">
            BB
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Barbearia do Marcão</p>
            <p className="text-[11px] text-emerald-400">online</p>
          </div>
        </div>

        {/* Mensagens */}
        <div className="p-4 space-y-2.5 bg-[#0b141a] min-h-[340px]">
          {conversa.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.25 }}
              className={`flex ${msg.de === 'bot' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                  msg.de === 'bot'
                    ? 'bg-yellow-400 text-zinc-900 font-medium rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                }`}
              >
                {msg.texto}
                <span
                  className={`block text-right text-[10px] mt-1 ${
                    msg.de === 'bot' ? 'text-zinc-900/50' : 'text-zinc-500'
                  }`}
                >
                  {msg.hora}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function AtendenteWhatsApp() {
  return (
    <section id="whatsapp" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-zinc-950 overflow-hidden">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-400/[0.06] blur-[120px] rounded-full"
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <span className="inline-block text-sm font-semibold text-yellow-400 uppercase tracking-widest mb-3">
            O diferencial
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            Seu WhatsApp atende sozinho —{' '}
            <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
              de verdade
            </span>
            .
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400">
            Lembrete automático qualquer sistema manda. O seu vai além: entende o que o
            cliente escreve, marca, remarca, cancela e cadastra gente nova — sem você largar
            a tesoura pra responder mensagem.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <ConversaWhatsApp />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <ul className="space-y-5 mb-10">
              {capacidades.map((texto, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-zinc-300">{texto}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-zinc-500 mb-4">
              Disponível nos planos <span className="text-zinc-300 font-medium">Profissional</span> e{' '}
              <span className="text-zinc-300 font-medium">Premium</span>.
            </p>

            <Button
              size="lg"
              asChild
              className="group bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 active:scale-[0.98] transition-all rounded-xl"
            >
              <Link href="#pricing">
                Ver planos
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
