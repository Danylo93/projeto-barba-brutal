'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Clock, Zap, AlertTriangle, Flame, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useTrialStatus, { TrialUrgencia } from '@/hooks/useTrialStatus'

const urgenciaConfig: Record<
  TrialUrgencia,
  {
    bg: string
    border: string
    text: string
    progressBar: string
    icon: typeof Clock
    glow: string
  }
> = {
  safe: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-800/60',
    text: 'text-emerald-300',
    progressBar: 'bg-emerald-400',
    icon: Clock,
    glow: '',
  },
  warning: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-800/60',
    text: 'text-amber-300',
    progressBar: 'bg-amber-400',
    icon: Zap,
    glow: '',
  },
  danger: {
    bg: 'bg-orange-950/80',
    border: 'border-orange-800/60',
    text: 'text-orange-300',
    progressBar: 'bg-orange-400',
    icon: AlertTriangle,
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.15)]',
  },
  critical: {
    bg: 'bg-red-950/80',
    border: 'border-red-800/60',
    text: 'text-red-300',
    progressBar: 'bg-red-400',
    icon: Flame,
    glow: 'shadow-[0_0_30px_rgba(248,113,113,0.2)]',
  },
}

function getMensagem(diasRestantes: number, urgencia: TrialUrgencia): string {
  if (diasRestantes <= 0) return 'Seu período de teste expirou!'
  if (urgencia === 'critical')
    return `Urgente! Seu teste expira em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}.`
  if (urgencia === 'danger')
    return `Seu teste está acabando — ${diasRestantes} dias restantes.`
  if (urgencia === 'warning')
    return `Seu período de teste está na metade — ${diasRestantes} dias restantes.`
  return `Aproveite seu período de teste! ${diasRestantes} dias restantes.`
}

function getSubMensagem(urgencia: TrialUrgencia): string {
  if (urgencia === 'critical' || urgencia === 'danger')
    return 'Assine agora para não perder seus dados e agendamentos.'
  if (urgencia === 'warning')
    return 'Garanta seu plano e continue gerenciando sua barbearia.'
  return 'Use todas as funcionalidades sem restrições.'
}

export default function TrialBanner() {
  const trial = useTrialStatus()
  const [fechando, setFechando] = useState(false)

  // Não mostrar se não está em trial, banner oculto, ou carregando
  if (!trial.emTeste || trial.ocultado || trial.carregando) return null

  const config = urgenciaConfig[trial.urgencia]
  const Icone = config.icon

  const handleOcultar = () => {
    setFechando(true)
    setTimeout(() => trial.ocultarBanner(), 300)
  }

  return (
    <AnimatePresence>
      {!fechando && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div
            className={`relative ${config.bg} ${config.border} border-b backdrop-blur-md ${config.glow}`}
          >
            {/* Barra de progresso no topo */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800/50">
              <motion.div
                className={`h-full ${config.progressBar}`}
                initial={{ width: 0 }}
                animate={{ width: `${trial.percentualUsado}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Layout Desktop */}
              <div className="hidden sm:flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center`}
                  >
                    <Icone size={18} className={config.text} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${config.text} truncate`}>
                      {getMensagem(trial.diasRestantes, trial.urgencia)}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {getSubMensagem(trial.urgencia)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Contador visual de dias */}
                  <div className="hidden lg:flex items-center gap-1.5">
                    <span className={`text-2xl font-black ${config.text} tabular-nums`}>
                      {trial.diasRestantes}
                    </span>
                    <span className="text-xs text-zinc-500 leading-tight">
                      dias
                      <br />
                      restantes
                    </span>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/planos"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 
                      bg-yellow-400 text-zinc-900 hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98]
                      shadow-[0_0_20px_rgba(250,204,21,0.2)]`}
                  >
                    Assinar Agora
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {/* Fechar */}
                  <button
                    onClick={handleOcultar}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    aria-label="Ocultar notificação"
                    title="Ocultar por 24 horas"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Layout Mobile */}
              <div className="sm:hidden py-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icone size={16} className={`${config.text} flex-shrink-0`} />
                    <p className={`text-sm font-semibold ${config.text} leading-snug`}>
                      {getMensagem(trial.diasRestantes, trial.urgencia)}
                    </p>
                  </div>
                  <button
                    onClick={handleOcultar}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                    aria-label="Ocultar notificação"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Progress bar mobile */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${config.progressBar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${trial.percentualUsado}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${config.text} tabular-nums flex-shrink-0`}>
                    {trial.diasRestantes}d
                  </span>
                </div>

                <Link
                  href="/planos"
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-bold 
                    bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors
                    active:scale-[0.98]"
                >
                  Assinar Agora
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
