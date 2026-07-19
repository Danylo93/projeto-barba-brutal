'use client'

import { useEffect, useState } from 'react'
import { Globe, Copy, Check, ExternalLink } from 'lucide-react'
import { Card } from './Painel'

/**
 * Card do painel do dono com o link da página pública da barbearia
 * (/barbearia/<dominio-ou-id>), para copiar e compartilhar com os clientes.
 */
export default function PaginaPublicaCard({
    dominio,
    id,
}: {
    dominio?: string | null
    id: number
}) {
    const slug = dominio || String(id)
    const [url, setUrl] = useState(`/barbearia/${slug}`)
    const [copiado, setCopiado] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setUrl(`${window.location.origin}/barbearia/${slug}`)
        }
    }, [slug])

    async function copiar() {
        try {
            await navigator.clipboard.writeText(url)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
        } catch {
            /* clipboard indisponível — ignora */
        }
    }

    return (
        <Card className="p-5 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/80 text-yellow-400">
                        <Globe size={22} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white">Sua página pública</h3>
                        <p className="text-sm text-zinc-400">
                            Compartilhe este link com seus clientes para agendarem online.
                        </p>
                        <p className="mt-2 break-all text-sm font-medium text-yellow-400">{url}</p>
                    </div>
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                    <button
                        onClick={copiar}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 active:scale-95"
                    >
                        {copiado ? (
                            <Check size={16} className="text-green-400" />
                        ) : (
                            <Copy size={16} />
                        )}
                        {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-zinc-900 transition-all hover:bg-yellow-300 active:scale-95"
                    >
                        <ExternalLink size={16} />
                        Abrir
                    </a>
                </div>
            </div>
        </Card>
    )
}
