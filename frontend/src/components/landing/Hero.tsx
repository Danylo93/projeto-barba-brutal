'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CalendarClock,
  Scissors,
  Star,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';

/* Contador animado que dispara quando entra na tela */
function CountUp({
  end,
  suffix = '',
  decimals = 0,
  duration = 1.6,
}: {
  end: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValor(end);
      return;
    }
    let raf: number;
    const inicio = performance.now();
    const tick = (agora: number) => {
      const p = Math.min((agora - inicio) / (duration * 1000), 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValor(end * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration, reduced]);

  return (
    <span ref={ref} className="tabular-nums">
      {valor.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* Mockup do painel (mostra o produto no hero — padrão Linear/Notion) */
function DashboardMockup() {
  const reduced = useReducedMotion();
  const barras = [38, 62, 45, 80, 58, 92, 70];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.5 }}
      className="relative max-w-4xl mx-auto"
    >
      {/* Glow atrás do mockup */}
      <div className="absolute -inset-6 bg-yellow-400/10 blur-3xl rounded-full" aria-hidden />

      <motion.div
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Barra do navegador */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <div className="ml-3 flex-1 max-w-xs h-6 rounded-md bg-zinc-800 flex items-center px-3">
            <span className="text-[10px] text-zinc-500 truncate">
              barbabrutal.app/dashboard
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[
              { icone: Calendar, rotulo: 'Hoje', valor: '12', cor: 'text-yellow-400' },
              { icone: Users, rotulo: 'Clientes', valor: '156', cor: 'text-green-400' },
              { icone: DollarSign, rotulo: 'Mês', valor: 'R$ 4.280', cor: 'text-yellow-400' },
            ].map(({ icone: Icone, rotulo, valor, cor }, i) => (
              <motion.div
                key={rotulo}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.12 }}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 sm:p-4"
              >
                <div className="flex items-center gap-2">
                  <Icone size={14} className={cor} />
                  <span className="text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500">
                    {rotulo}
                  </span>
                </div>
                <p className="text-sm sm:text-xl font-black text-white mt-1 tabular-nums">
                  {valor}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid sm:grid-cols-5 gap-3 sm:gap-4">
            {/* Gráfico de barras */}
            <div className="sm:col-span-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500 mb-3">
                Agendamentos da semana
              </p>
              <div className="flex items-end gap-2 h-24 sm:h-32">
                {barras.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 1.1 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                    style={{ height: `${h}%`, transformOrigin: 'bottom' }}
                    className={`flex-1 rounded-t-md ${
                      i === 5 ? 'bg-yellow-400' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Próximos horários */}
            <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500 mb-3">
                Próximos horários
              </p>
              <div className="space-y-2">
                {[
                  { hora: '09:00', nome: 'João S.', servico: 'Corte + Barba' },
                  { hora: '10:30', nome: 'Pedro L.', servico: 'Corte' },
                  { hora: '11:00', nome: 'Rafa M.', servico: 'Barba' },
                ].map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + i * 0.12 }}
                    className="flex items-center gap-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 px-2.5 py-2"
                  >
                    <span className="text-[10px] sm:text-xs font-bold text-yellow-400 tabular-nums">
                      {a.hora}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs text-white truncate">{a.nome}</p>
                      <p className="text-[9px] sm:text-[10px] text-zinc-500 truncate">
                        {a.servico}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-zinc-950">
      {/* Fundo: glows + grade sutil */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-yellow-400/[0.07] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-[-10%] w-[500px] h-[400px] bg-amber-600/[0.05] blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(39 39 42 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center">
          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 mb-8"
          >
            <Scissors size={14} className="text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">
              30 dias grátis — sem cartão de crédito
            </span>
          </motion.div>

          {/* Headline curta orientada a resultado */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6"
          >
            Agenda cheia.{' '}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Gestão sem caos.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
          >
            Agendamento online 24h, equipe, clientes e receita da sua barbearia —
            tudo em um só painel.
          </motion.p>

          {/* CTA único dominante */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center gap-4 mb-16"
          >
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
            <Link
              href="/login?destino=/agendamento"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              <CalendarClock size={15} />
              Sou cliente — quero agendar um horário
            </Link>
          </motion.div>
        </div>

        {/* Produto visível no hero */}
        <DashboardMockup />

        {/* Prova social com contadores animados */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-center"
        >
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              <CountUp end={500} suffix="+" />
            </div>
            <div className="text-sm text-zinc-500 mt-1">Barbearias ativas</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              <CountUp end={50} suffix="k+" />
            </div>
            <div className="text-sm text-zinc-500 mt-1">Agendamentos/mês</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              <CountUp end={99.9} suffix="%" decimals={1} />
            </div>
            <div className="text-sm text-zinc-500 mt-1">Uptime</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white inline-flex items-center gap-1.5">
              <CountUp end={4.9} decimals={1} />
              <Star className="h-6 w-6 text-yellow-400 fill-current" />
            </div>
            <div className="text-sm text-zinc-500 mt-1">Avaliação média</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
