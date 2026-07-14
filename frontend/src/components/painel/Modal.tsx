'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

export interface ModalProps {
    aberto: boolean
    titulo: string
    onFechar: () => void
    children: React.ReactNode
}

/** Modal escuro reutilizável para formulários dos painéis. */
export default function Modal({ aberto, titulo, onFechar, children }: ModalProps) {
    useEffect(() => {
        if (!aberto) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [aberto, onFechar])

    if (!aberto) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={onFechar}
        >
            <div
                className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">{titulo}</h3>
                    <button
                        onClick={onFechar}
                        aria-label="Fechar"
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}

export const inputModalClasses =
    'w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'
