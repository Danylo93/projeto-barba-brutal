'use client'

import { useState } from 'react'
import { Ticket, Search, Plus, Trash2, Tag, Percent } from 'lucide-react'
import Cabecalho from '@/components/shared/Cabecalho'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'

export default function MarketingPage() {
    const { usuario } = useSessao()
    const { httpGet, httpPost, httpDelete } = useAPI()
    const [loading, setLoading] = useState(false)
    const [cupons, setCupons] = useState<any[]>([])

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
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                            <Ticket size={24} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Cupons Ativos</h2>
                            <p className="text-sm text-zinc-400">Atraia mais clientes com descontos</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-lg transition-colors">
                        <Plus size={20} /> Novo Cupom
                    </button>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                    <Tag size={48} className="text-zinc-700 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum cupom criado ainda</h3>
                    <p className="text-zinc-400 max-w-md">O backend da API de cupons está sendo preparado. Em breve você poderá distribuir códigos como "BEMVINDO10" para atrair novos agendamentos.</p>
                </div>
            </div>
        </div>
    )
}
