'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import Cabecalho from '@/components/shared/Cabecalho'
import PrecosDoProfissional from '@/components/painel/PrecosDoProfissional'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Tela do barbeiro para definir quanto ele cobra por cada serviço.
 *
 * O id do profissional vem de `meu-cadastro`, e não do que a tela souber do
 * usuário: é o backend que diz qual cadastro pertence a quem.
 */
export default function PaginaMeusPrecos() {
    const { httpGet } = useAPI()
    const [profissionalId, setProfissionalId] = useState<number | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    useEffect(() => {
        let ativo = true
        httpGet('profissionais/meu-cadastro')
            .then((p) => {
                if (!ativo) return
                setProfissionalId(p?.id ?? null)
            })
            .catch((e) => {
                if (!ativo) return
                setErro(e instanceof Error ? e.message : 'Não foi possível carregar seu cadastro.')
            })
            .finally(() => ativo && setCarregando(false))
        return () => {
            ativo = false
        }
    }, [httpGet])

    return (
        <div className="flex min-h-screen flex-col bg-zinc-900">
            <Cabecalho
                titulo="Meus Preços"
                descricao="Defina quanto você cobra por cada serviço que faz."
            />
            {/* Largura travada: sem isto, em 1440px o nome do serviço ficava
                num canto da tela e o campo de preço no outro. */}
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
                {carregando && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((n) => (
                            <Skeleton key={n} className="h-16 w-full bg-zinc-800" />
                        ))}
                    </div>
                )}

                {!carregando && erro && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
                        <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-400" />
                        <p className="text-sm text-amber-200">{erro}</p>
                    </div>
                )}

                {!carregando && !erro && profissionalId && (
                    <PrecosDoProfissional profissionalId={profissionalId} ehOProprioBarbeiro />
                )}
            </div>
        </div>
    )
}
