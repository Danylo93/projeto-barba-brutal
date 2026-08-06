'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradeCalloutProps {
  titulo?: string
  descricao: string
  ctaPrincipal?: string
  destinoPrincipal?: string
  ctaSecundario?: string
  destinoSecundario?: string
}

export default function UpgradeCallout({
  titulo = 'Upgrade disponível',
  descricao,
  ctaPrincipal = 'Ver planos',
  destinoPrincipal = '/planos',
  ctaSecundario = 'Gerenciar assinatura',
  destinoSecundario = '/assinatura',
}: UpgradeCalloutProps) {
  const router = useRouter()

  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-yellow-400/10 to-amber-500/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
            <Sparkles size={14} />
            {titulo}
          </p>
          <p className="mt-1 text-sm text-zinc-300">{descricao}</p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[220px]">
          <button
            onClick={() => router.push(destinoPrincipal)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-300 transition-colors"
          >
            {ctaPrincipal}
            <ArrowRight size={15} />
          </button>
          <button
            onClick={() => router.push(destinoSecundario)}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {ctaSecundario}
          </button>
        </div>
      </div>
    </div>
  )
}
