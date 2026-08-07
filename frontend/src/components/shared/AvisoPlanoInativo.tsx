'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Crown, Sparkles, X } from 'lucide-react'
import usePlanoAssinatura from '@/hooks/usePlanoAssinatura'
import { deveAbrirOConvite, deveMostrarAFaixa, textoDoConvite } from '@/lib/plano-inativo'

/** Uma vez por sessão. Fechou a aba, o convite volta — ele não é para esquecer. */
const CHAVE_DISPENSA = 'barbabrutal:convite-plano-dispensado'

/**
 * O convite para escolher um plano quando a assinatura está inativa.
 *
 * Isto era um bloqueio: modal sem botão de fechar por cima do painel inteiro,
 * com a API respondendo 403 em tudo. O dono não via a agenda de amanhã nem a
 * lista de clientes. Numa campanha de anúncios essa é a pior tela possível —
 * a pessoa pagou para chegar até aqui e encontra uma catraca.
 *
 * Agora o painel continua funcionando (o backend rebaixa para o plano de
 * entrada em vez de barrar) e o que aparece é convite: um modal na primeira
 * vez da sessão, dispensável, e depois uma faixa fina que fica à mão sem
 * atrapalhar o trabalho.
 */
export default function AvisoPlanoInativo(props: { children: React.ReactNode }) {
  const pathname = usePathname()
  const plano = usePlanoAssinatura()
  const [dispensado, setDispensado] = useState(true)
  const [montado, setMontado] = useState(false)

  // O sessionStorage só existe no navegador; ler durante o render do servidor
  // faz a página quebrar antes de mostrar qualquer coisa.
  useEffect(() => {
    setDispensado(window.sessionStorage.getItem(CHAVE_DISPENSA) === '1')
    setMontado(true)
  }, [])

  const dispensar = useCallback(() => {
    window.sessionStorage.setItem(CHAVE_DISPENSA, '1')
    setDispensado(true)
  }, [])

  // Plano vencido dispensa por TELA, não pela sessão: foi o pedido explícito —
  // quem já usou o teste inteiro e não comprou continua sendo lembrada em cada
  // lugar que acessar, até a compra. Ela fecha e trabalha; na próxima tela o
  // convite volta.
  useEffect(() => {
    if (plano.planoExpirado) setDispensado(false)
  }, [pathname, plano.planoExpirado])

  const estado = {
    inativa: plano.bloqueado,
    planoExpirado: plano.planoExpirado,
    carregando: plano.carregando || !montado,
    erro: plano.erro,
    rota: pathname,
    dispensadoNaSessao: dispensado,
  }

  const texto = textoDoConvite(plano.planoExpirado)

  const abrirModal = deveAbrirOConvite(estado)
  const mostrarFaixa = deveMostrarAFaixa(estado)

  // Esc fecha, como todo modal que se preze.
  useEffect(() => {
    if (!abrirModal) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispensar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [abrirModal, dispensar])

  return (
    <>
      {mostrarFaixa && (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-center text-sm text-yellow-200">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-yellow-400" />
            {plano.planoExpirado
              ? 'Seu plano venceu. Alguns recursos ficam limitados.'
              : 'Seu plano está inativo. Alguns recursos ficam limitados.'}
          </span>
          <Link
            href="/planos"
            className="inline-flex items-center gap-1 font-bold text-yellow-300 underline underline-offset-4 hover:text-yellow-200"
          >
            Escolher um plano <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {props.children}

      {abrirModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm"
          onClick={dispensar}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-convite-plano"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl border border-yellow-400/30 bg-zinc-900/95 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,.75)] sm:p-9"
          >
            <button
              type="button"
              onClick={dispensar}
              aria-label="Fechar"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
              <Crown size={30} />
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-yellow-300">
              <Sparkles size={14} /> {texto.etiqueta}
            </div>
            <h2 id="titulo-convite-plano" className="text-2xl font-black text-white sm:text-3xl">
              {texto.titulo}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-300 sm:text-base">
              {texto.corpo}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                href="/planos"
                onClick={dispensar}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-zinc-950 transition hover:bg-yellow-300"
              >
                Ver os planos <ArrowRight size={17} />
              </Link>
              <button
                type="button"
                onClick={dispensar}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 font-semibold text-white transition hover:border-zinc-500"
              >
                Agora não
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
