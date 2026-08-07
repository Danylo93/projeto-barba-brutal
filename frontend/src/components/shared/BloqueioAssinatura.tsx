'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crown, LockKeyhole, ArrowRight } from 'lucide-react'
import usePlanoAssinatura from '@/hooks/usePlanoAssinatura'

export default function BloqueioAssinatura(props: { children: React.ReactNode }) {
  const pathname = usePathname()
  const plano = usePlanoAssinatura()
  const rotaDeReativacao = pathname.startsWith('/planos') || pathname.startsWith('/assinatura')

  if (plano.carregando || plano.erro || !plano.bloqueado || rotaDeReativacao) {
    return props.children
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[5px] opacity-45">
        {props.children}
      </div>

      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/75 px-4 backdrop-blur-md">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-plano-expirado"
          className="w-full max-w-lg rounded-3xl border border-yellow-400/30 bg-zinc-900/95 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,.75)] sm:p-9"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
            <LockKeyhole size={30} />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-yellow-300">
            <Crown size={14} /> Acesso pausado
          </div>
          <h1 id="titulo-plano-expirado" className="text-2xl font-black text-white sm:text-3xl">
            Seu plano expirou
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-300 sm:text-base">
            Seus dados continuam guardados. Escolha um plano para liberar novamente a agenda, os clientes e as ferramentas da barbearia.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href="/planos"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-zinc-950 transition hover:bg-yellow-300"
            >
              Escolher um plano <ArrowRight size={17} />
            </Link>
            <Link
              href="/assinatura"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 font-semibold text-white transition hover:border-zinc-500"
            >
              Ver minha assinatura
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
