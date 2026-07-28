'use client'

/**
 * Banner de cookies mostrado na primeira visita — ao SaaS e ao site de cada
 * barbearia.
 *
 * O desenho segue o que a ANPD cobra: recusar é um clique, igual a aceitar;
 * nada de "aceitar" em destaque e "recusar" escondido num submenu. Enquanto
 * o titular não decide, só os cookies essenciais valem.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    gravarConsentimento,
    lerConsentimento,
    registrarNoServidor,
    type Consentimento,
} from '@/lib/consentimento'

interface Props {
    /** Site de uma barbearia: amarra o consentimento a ela. */
    tenantId?: number | null
}

export default function BannerConsentimento({ tenantId = null }: Props) {
    const [aberto, setAberto] = useState(false)
    const [detalhes, setDetalhes] = useState(false)
    const [analise, setAnalise] = useState(false)
    const [marketing, setMarketing] = useState(false)

    useEffect(() => {
        // Só decide depois de montar: no servidor não há localStorage, e abrir
        // por padrão causaria um piscar do banner para quem já respondeu.
        if (!lerConsentimento()) setAberto(true)

        function reabrir() {
            if (!lerConsentimento()) {
                setDetalhes(false)
                setAberto(true)
            }
        }
        window.addEventListener('consentimento-alterado', reabrir)
        return () => window.removeEventListener('consentimento-alterado', reabrir)
    }, [])

    const decidir = useCallback(
        (escolha: { analise: boolean; marketing: boolean }) => {
            const c: Consentimento = gravarConsentimento(escolha)
            setAberto(false)
            const token =
                typeof window !== 'undefined'
                    ? localStorage.getItem('barba-brutal-token') ||
                      localStorage.getItem('token')
                    : null
            void registrarNoServidor(c, { tenantId, token })
        },
        [tenantId],
    )

    return (
        <AnimatePresence>
            {aberto && (
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="titulo-cookies"
                    className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4"
                >
                    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/98 shadow-2xl shadow-black/60 backdrop-blur-xl">
                        <div className="flex items-start gap-3 p-5">
                            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400 sm:flex">
                                <Cookie size={20} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 id="titulo-cookies" className="font-bold text-white">
                                    Este site usa cookies
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                                    Os essenciais fazem o login e o agendamento funcionarem e não podem
                                    ser desligados. Os demais só passam a valer se você deixar. Veja a{' '}
                                    <Link
                                        href="/privacy"
                                        className="text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
                                    >
                                        Política de Privacidade
                                    </Link>{' '}
                                    e a{' '}
                                    <Link
                                        href="/cookies"
                                        className="text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
                                    >
                                        Política de Cookies
                                    </Link>
                                    .
                                </p>

                                <AnimatePresence>
                                    {detalhes && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 flex flex-col gap-3 border-t border-zinc-800 pt-4">
                                                <Categoria
                                                    titulo="Essenciais"
                                                    descricao="Sessão, segurança e o carrinho do agendamento. Sem eles o site não funciona."
                                                    marcado
                                                    travado
                                                />
                                                <Categoria
                                                    titulo="Análise de uso"
                                                    descricao="Quantas pessoas visitam e onde travam, para melhorarmos as telas. Números agregados."
                                                    marcado={analise}
                                                    onChange={setAnalise}
                                                />
                                                <Categoria
                                                    titulo="Marketing"
                                                    descricao="Medir anúncios e mostrar ofertas relevantes fora do site."
                                                    marcado={marketing}
                                                    onChange={setMarketing}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                    {/* Aceitar e recusar têm o mesmo peso visual, de propósito. */}
                                    <button
                                        onClick={() => decidir({ analise: true, marketing: true })}
                                        className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-yellow-300"
                                    >
                                        Aceitar todos
                                    </button>
                                    <button
                                        onClick={() => decidir({ analise: false, marketing: false })}
                                        className="rounded-xl border border-zinc-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                                    >
                                        Recusar não essenciais
                                    </button>
                                    {detalhes ? (
                                        <button
                                            onClick={() => decidir({ analise, marketing })}
                                            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                                        >
                                            Salvar minha escolha
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setDetalhes(true)}
                                            className="rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 underline underline-offset-4 transition-colors hover:text-white"
                                        >
                                            Escolher o que aceito
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Fechar não é consentir: o banner volta na próxima visita. */}
                            <button
                                onClick={() => setAberto(false)}
                                aria-label="Fechar sem decidir agora"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function Categoria({
    titulo,
    descricao,
    marcado,
    travado = false,
    onChange,
}: {
    titulo: string
    descricao: string
    marcado: boolean
    travado?: boolean
    onChange?: (v: boolean) => void
}) {
    return (
        <label
            className={`flex items-start gap-3 rounded-xl border p-3 ${
                travado
                    ? 'cursor-default border-zinc-800 bg-zinc-800/40'
                    : 'cursor-pointer border-zinc-800 hover:bg-zinc-800/40'
            }`}
        >
            <input
                type="checkbox"
                checked={marcado}
                disabled={travado}
                onChange={(e) => onChange?.(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-yellow-400"
            />
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">
                    {titulo}
                    {travado && <span className="ml-2 text-xs font-normal text-zinc-500">sempre ativos</span>}
                </span>
                <span className="block text-xs leading-relaxed text-zinc-500">{descricao}</span>
            </span>
        </label>
    )
}
