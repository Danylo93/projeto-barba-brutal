'use client'

/**
 * Relatório de comissões da equipe (visão do dono da barbearia).
 * Mostra, por profissional no mês escolhido: atendimentos, faturamento gerado,
 * comissão a pagar e quanto sobra para a barbearia.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Users, Wallet, TrendingUp } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { Skeleton } from '@/components/ui/skeleton'

interface Linha {
    profissionalId: number
    profissional: string
    comissaoPercent: number
    atendimentos: number
    faturamento: number
    comissao: number
    liquidoBarbearia: number
}

interface Resumo {
    mes: string
    linhas: Linha[]
    totalFaturamento: number
    totalComissao: number
    totalLiquido: number
}

const dinheiro = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function mesAtual() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function deslocarMes(ref: string, passo: number) {
    const [a, m] = ref.split('-').map(Number)
    const d = new Date(a, m - 1 + passo, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function rotuloMes(ref: string) {
    const [a, m] = ref.split('-').map(Number)
    return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    })
}

export default function RelatorioComissoes() {
    const { httpGet } = useAPI()
    const [mes, setMes] = useState(mesAtual)
    const [dados, setDados] = useState<Resumo | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    const carregar = useCallback(async () => {
        try {
            setCarregando(true)
            setErro('')
            const r = await httpGet(`tenants/me/comissoes?mes=${mes}`)
            setDados(r && Array.isArray(r.linhas) ? r : null)
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível carregar as comissões.')
            setDados(null)
        } finally {
            setCarregando(false)
        }
    }, [httpGet, mes])

    useEffect(() => {
        carregar()
    }, [carregar])

    const ehMesAtual = mes === mesAtual()
    const comMovimento = useMemo(
        () => (dados?.linhas ?? []).filter((l) => l.atendimentos > 0),
        [dados],
    )

    return (
        <section className="flex flex-col gap-5">
            {/* Seletor de mês */}
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">Comissões da equipe</h2>
                <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
                    <button
                        onClick={() => setMes(deslocarMes(mes, -1))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="min-w-[9.5rem] text-center text-sm font-semibold capitalize text-white">
                        {rotuloMes(mes)}
                    </span>
                    <button
                        onClick={() => setMes(deslocarMes(mes, 1))}
                        disabled={ehMesAtual}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Próximo mês"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {erro && (
                <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                    {erro}
                </p>
            )}

            {carregando ? (
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                dados && (
                    <>
                        {/* Totais */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Total
                                icone={<TrendingUp size={18} />}
                                rotulo="Faturamento"
                                valor={dinheiro(dados.totalFaturamento)}
                            />
                            <Total
                                icone={<Wallet size={18} />}
                                rotulo="Comissões a pagar"
                                valor={dinheiro(dados.totalComissao)}
                                cor="text-amber-400"
                            />
                            <Total
                                icone={<Users size={18} />}
                                rotulo="Fica na barbearia"
                                valor={dinheiro(dados.totalLiquido)}
                                cor="text-green-400"
                            />
                        </div>

                        {/* Lista por profissional */}
                        {comMovimento.length === 0 ? (
                            <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
                                Nenhum atendimento neste mês.
                            </p>
                        ) : (
                            <>
                                {/* Cartões no mobile */}
                                <ul className="flex flex-col gap-3 lg:hidden">
                                    {comMovimento.map((l) => (
                                        <li
                                            key={l.profissionalId}
                                            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <span className="truncate font-semibold text-white">
                                                    {l.profissional}
                                                </span>
                                                <span className="shrink-0 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                                                    {l.comissaoPercent}%
                                                </span>
                                            </div>
                                            <dl className="grid grid-cols-2 gap-y-2 text-sm">
                                                <dt className="text-zinc-500">Atendimentos</dt>
                                                <dd className="text-right text-zinc-300">{l.atendimentos}</dd>
                                                <dt className="text-zinc-500">Faturamento</dt>
                                                <dd className="text-right text-zinc-300">
                                                    {dinheiro(l.faturamento)}
                                                </dd>
                                                <dt className="text-zinc-500">Comissão</dt>
                                                <dd className="text-right font-bold text-amber-400">
                                                    {dinheiro(l.comissao)}
                                                </dd>
                                            </dl>
                                        </li>
                                    ))}
                                </ul>

                                {/* Tabela no desktop */}
                                <div className="hidden overflow-hidden rounded-xl border border-zinc-800 lg:block">
                                    <table className="w-full text-sm">
                                        <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold">Profissional</th>
                                                <th className="px-4 py-3 text-right font-semibold">%</th>
                                                <th className="px-4 py-3 text-right font-semibold">Atend.</th>
                                                <th className="px-4 py-3 text-right font-semibold">Faturamento</th>
                                                <th className="px-4 py-3 text-right font-semibold">Comissão</th>
                                                <th className="px-4 py-3 text-right font-semibold">Barbearia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/70">
                                            {comMovimento.map((l) => (
                                                <tr key={l.profissionalId} className="hover:bg-zinc-900/40">
                                                    <td className="px-4 py-3 font-medium text-white">
                                                        {l.profissional}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-zinc-400">
                                                        {l.comissaoPercent}%
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                                                        {l.atendimentos}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                                                        {dinheiro(l.faturamento)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-amber-400 tabular-nums">
                                                        {dinheiro(l.comissao)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-green-400 tabular-nums">
                                                        {dinheiro(l.liquidoBarbearia)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {dados.linhas.some((l) => l.comissaoPercent === 0) && (
                            <p className="text-xs text-zinc-500">
                                Profissionais com 0% não têm comissão configurada — defina o percentual em{' '}
                                <span className="text-zinc-400">Profissionais</span>.
                            </p>
                        )}
                    </>
                )
            )}
        </section>
    )
}

function Total({
    icone,
    rotulo,
    valor,
    cor = 'text-white',
}: {
    icone: React.ReactNode
    rotulo: string
    valor: string
    cor?: string
}) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-1 flex items-center gap-2 text-zinc-500">
                {icone}
                <span className="text-xs font-semibold uppercase tracking-wider">{rotulo}</span>
            </div>
            <p className={`text-xl font-black tabular-nums ${cor}`}>{valor}</p>
        </div>
    )
}
