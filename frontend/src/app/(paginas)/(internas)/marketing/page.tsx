'use client'

import { Ticket, Tag } from 'lucide-react'
import Cabecalho from '@/components/shared/Cabecalho'
import useSessao from '@/data/hooks/useSessao'
import UpgradeCallout from '@/components/painel/UpgradeCallout'
import usePlanoAssinatura from '@/hooks/usePlanoAssinatura'

export default function MarketingPage() {
    const { usuario } = useSessao()
    const plano = usePlanoAssinatura()

    const isTenant = usuario?.tipo === 'tenant'

    if (!isTenant) {
        return (
            <div className="flex flex-col bg-zinc-900 min-h-screen">
                <Cabecalho titulo="Marketing" descricao="Acesso restrito ao dono da barbearia." />
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-zinc-900 min-h-screen">
            <Cabecalho
                titulo="Marketing Digital"
                descricao="Crie e gerencie cupons de desconto para seus clientes."
            />
            <div className="container py-10 px-4 md:px-0 max-w-5xl mx-auto">
                {plano.isPremium ? (
                    <>
                        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10">
                                    <Ticket size={24} className="text-yellow-400" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-bold text-white">Cupons</h2>
                                    <p className="text-sm text-zinc-400">Atraia mais clientes com descontos</p>
                                </div>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-400 sm:self-auto">
                                Em breve
                            </span>
                        </div>

                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                            <Tag size={48} className="text-zinc-700 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Nenhum cupom criado ainda</h3>
                            <p className="text-zinc-400 max-w-md">Estamos preparando os cupons. Em breve você vai poder criar códigos como <span className="font-mono text-zinc-300">BEMVINDO10</span> e atrair agendamentos novos.</p>
                        </div>
                    </>
                ) : (
                    <UpgradeCallout
                        titulo="Marketing disponível no Premium"
                        descricao="No plano Premium você libera os recursos de marketing e cupons da barbearia."
                        ctaPrincipal="Ver planos"
                        ctaSecundario="Abrir assinatura"
                    />
                )}
            </div>
        </div>
    )
}
