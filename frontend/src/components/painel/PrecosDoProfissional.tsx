'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Tag } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { useToast } from '@/hooks/use-toast'
import { Botao } from '@/components/ui/botao'
import { Skeleton } from '@/components/ui/skeleton'
import { emReais } from '@/lib/agendamento-utils'

interface LinhaDePreco {
    servicoId: number
    nome: string
    /** Preço da barbearia — o padrão de quem não personalizou. */
    precoPadrao: number
    preco: number
    personalizado: boolean
}

export interface PrecosDoProfissionalProps {
    profissionalId: number
    /** Muda só o texto de apoio: o barbeiro vê "seu preço", o dono vê "o preço dele". */
    ehOProprioBarbeiro?: boolean
    aoSalvar?: () => void
}

/** Aceita "45,90" e "45.90"; devolve null quando o campo está vazio. */
function paraNumero(texto: string): number | null {
    const limpo = texto.trim().replace(',', '.')
    if (limpo === '') return null
    const valor = Number(limpo)
    return Number.isFinite(valor) ? valor : NaN
}

/**
 * Tabela de preços de um profissional.
 *
 * Campo vazio = cobra o preço da barbearia, e continua acompanhando os
 * reajustes dela. Preencher só personaliza aquele serviço.
 */
export default function PrecosDoProfissional({
    profissionalId,
    ehOProprioBarbeiro = false,
    aoSalvar,
}: PrecosDoProfissionalProps) {
    const { httpGet, httpPut } = useAPI()
    const { success, error: toastError } = useToast()

    const [linhas, setLinhas] = useState<LinhaDePreco[]>([])
    const [rascunho, setRascunho] = useState<Record<number, string>>({})
    const [carregando, setCarregando] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    const carregar = useCallback(async () => {
        try {
            setCarregando(true)
            setErro('')
            const dados = await httpGet(`profissionais/${profissionalId}/precos`)
            const lista: LinhaDePreco[] = Array.isArray(dados) ? dados : []
            setLinhas(lista)
            setRascunho(
                Object.fromEntries(
                    lista.map((l) => [
                        l.servicoId,
                        // Só preenche o campo do que foi personalizado: campo
                        // vazio é o jeito de dizer "uso o preço da barbearia".
                        l.personalizado ? String(l.preco).replace('.', ',') : '',
                    ])
                )
            )
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível carregar os preços.')
        } finally {
            setCarregando(false)
        }
    }, [httpGet, profissionalId])

    useEffect(() => {
        carregar()
    }, [carregar])

    async function salvar() {
        const precos: { servicoId: number; preco: number | null }[] = []
        for (const linha of linhas) {
            const valor = paraNumero(rascunho[linha.servicoId] ?? '')
            if (Number.isNaN(valor)) {
                toastError(
                    'Preço inválido',
                    `Confira o valor de "${linha.nome}". Use números, como 45 ou 45,90.`
                )
                return
            }
            precos.push({ servicoId: linha.servicoId, preco: valor })
        }

        try {
            setSalvando(true)
            setErro('')
            await httpPut(`profissionais/${profissionalId}/precos`, { precos })
            await carregar()
            success(
                'Preços salvos',
                ehOProprioBarbeiro
                    ? 'Seus novos valores já valem para os próximos agendamentos.'
                    : 'Os valores deste profissional já valem para os próximos agendamentos.'
            )
            aoSalvar?.()
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Não foi possível salvar os preços.'
            setErro(msg)
            toastError('Erro ao salvar', msg)
        } finally {
            setSalvando(false)
        }
    }

    if (carregando) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                    <Skeleton key={n} className="h-16 w-full bg-zinc-800" />
                ))}
            </div>
        )
    }

    if (linhas.length === 0) {
        return (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                <Tag size={32} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                    {ehOProprioBarbeiro
                        ? 'Você ainda não tem serviços vinculados. Peça ao dono da barbearia para liberar os serviços que você faz.'
                        : 'Este profissional ainda não tem serviços vinculados. Vincule os serviços na edição do cadastro.'}
                </p>
            </div>
        )
    }

    const alterado = linhas.some((l) => {
        const digitado = paraNumero(rascunho[l.servicoId] ?? '')
        return l.personalizado ? digitado !== l.preco : digitado !== null
    })

    return (
        <div className="flex flex-col gap-4">
            {erro && (
                <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
                    {erro}
                </div>
            )}

            <div className="flex flex-col gap-3">
                {linhas.map((linha) => {
                    const valor = rascunho[linha.servicoId] ?? ''
                    const usandoPadrao = valor.trim() === ''
                    return (
                        <div
                            key={linha.servicoId}
                            className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{linha.nome}</p>
                                <p className="text-xs text-zinc-500">
                                    Preço da barbearia: {emReais(linha.precoPadrao)}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                                        R$
                                    </span>
                                    <input
                                        inputMode="decimal"
                                        value={valor}
                                        onChange={(e) =>
                                            setRascunho((atual) => ({
                                                ...atual,
                                                [linha.servicoId]: e.target.value,
                                            }))
                                        }
                                        placeholder={String(linha.precoPadrao).replace('.', ',')}
                                        aria-label={`Preço de ${linha.nome}`}
                                        className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-10 pr-3 text-white placeholder-zinc-600 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={usandoPadrao}
                                    onClick={() =>
                                        setRascunho((atual) => ({
                                            ...atual,
                                            [linha.servicoId]: '',
                                        }))
                                    }
                                    title="Voltar ao preço da barbearia"
                                    aria-label={`Voltar ${linha.nome} ao preço da barbearia`}
                                    className="rounded-lg p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    <RotateCcw size={18} />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <p className="text-xs text-zinc-500">
                Campo em branco = cobra o preço da barbearia e acompanha os reajustes dela.
                Agendamentos já marcados mantêm o valor combinado.
            </p>

            <Botao onClick={salvar} carregando={salvando} disabled={salvando || !alterado}>
                Salvar preços
            </Botao>
        </div>
    )
}
