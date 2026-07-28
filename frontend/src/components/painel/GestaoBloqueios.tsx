'use client'

/**
 * Bloqueios de agenda: folga, almoço, férias ou feriado.
 * O dono escolhe de quem é o bloqueio (ou da barbearia inteira);
 * o barbeiro bloqueia apenas a própria agenda.
 */

import { useCallback, useEffect, useState } from 'react'
import { CalendarOff, Plus, Trash2, X } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import ConfirmModal from '@/components/shared/ConfirmModal'

interface Bloqueio {
    id: number
    profissionalId: number | null
    inicio: string
    fim: string
    motivo?: string | null
    profissional?: { id: number; nome: string } | null
}

interface ProfissionalResumo {
    id: number
    nome: string
}

const inputClasses =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-white ' +
    'focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400'

/** "2026-07-28T14:00" (formato do input datetime-local) a partir de uma data. */
function paraInputLocal(d: Date) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function formatarPeriodo(inicio: string, fim: string) {
    const de = new Date(inicio)
    const ate = new Date(fim)
    const dia = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return dia(de) === dia(ate)
        ? `${dia(de)} · ${hora(de)} às ${hora(ate)}`
        : `${dia(de)} ${hora(de)} → ${dia(ate)} ${hora(ate)}`
}

export default function GestaoBloqueios({ ehDono }: { ehDono: boolean }) {
    const { httpGet, httpPost, httpDelete } = useAPI()
    const { success, error: toastErro } = useToast()

    const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
    const [profissionais, setProfissionais] = useState<ProfissionalResumo[]>([])
    const [carregando, setCarregando] = useState(true)
    const [modalAberto, setModalAberto] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [confirmarExclusao, setConfirmarExclusao] = useState<number | null>(null)

    const agora = new Date()
    const daquiUmaHora = new Date(agora.getTime() + 60 * 60000)
    const [form, setForm] = useState({
        profissionalId: '',
        inicio: paraInputLocal(agora),
        fim: paraInputLocal(daquiUmaHora),
        motivo: '',
    })

    const carregar = useCallback(async () => {
        try {
            setCarregando(true)
            const [lista, profs] = await Promise.all([
                httpGet('bloqueios'),
                ehDono ? httpGet('profissionais') : Promise.resolve([]),
            ])
            setBloqueios(Array.isArray(lista) ? lista : [])
            setProfissionais(Array.isArray(profs) ? profs : [])
        } catch (e) {
            toastErro('Erro ao carregar', e instanceof Error ? e.message : 'Tente novamente.')
            setBloqueios([])
        } finally {
            setCarregando(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [httpGet, ehDono])

    useEffect(() => {
        carregar()
    }, [carregar])

    async function salvar(e: React.FormEvent) {
        e.preventDefault()
        if (new Date(form.fim) <= new Date(form.inicio)) {
            toastErro('Período inválido', 'O fim deve ser depois do início.')
            return
        }
        try {
            setSalvando(true)
            const payload: Record<string, unknown> = {
                inicio: new Date(form.inicio).toISOString(),
                fim: new Date(form.fim).toISOString(),
                motivo: form.motivo || undefined,
            }
            if (ehDono) {
                payload.profissionalId = form.profissionalId ? Number(form.profissionalId) : null
            }
            const r = await httpPost('bloqueios', payload)
            if (r?.statusCode >= 400 || (r?.message && !r?.id)) {
                throw new Error(r.message || 'Não foi possível criar o bloqueio.')
            }
            success('Bloqueio criado', 'Esse horário não aceita mais agendamentos.')
            setModalAberto(false)
            setForm({ ...form, motivo: '' })
            await carregar()
        } catch (e) {
            toastErro('Erro ao bloquear', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setSalvando(false)
        }
    }

    async function remover(id: number) {
        setConfirmarExclusao(null)
        try {
            await httpDelete(`bloqueios/${id}`)
            success('Bloqueio removido', 'O horário voltou a aceitar agendamentos.')
            await carregar()
        } catch (e) {
            toastErro('Erro ao remover', e instanceof Error ? e.message : 'Tente novamente.')
        }
    }

    return (
        <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white">Bloqueios de agenda</h2>
                    <p className="text-sm text-zinc-500">
                        Folga, almoço, férias ou feriado — esses horários não aceitam agendamento.
                    </p>
                </div>
                <button
                    onClick={() => setModalAberto(true)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-zinc-900 transition-transform hover:bg-yellow-300 active:scale-95"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Bloquear horário</span>
                </button>
            </div>

            {carregando ? (
                <Skeleton className="h-32 w-full" />
            ) : bloqueios.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-10 text-center">
                    <CalendarOff className="text-zinc-600" size={28} />
                    <p className="text-sm text-zinc-500">Nenhum bloqueio ativo.</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {bloqueios.map((b) => (
                        <li
                            key={b.id}
                            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                                <CalendarOff size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">
                                    {b.motivo || 'Indisponível'}
                                </p>
                                <p className="truncate text-sm text-zinc-400">
                                    {formatarPeriodo(b.inicio, b.fim)}
                                </p>
                                <p className="truncate text-xs text-zinc-500">
                                    {b.profissional?.nome ?? 'Barbearia inteira'}
                                </p>
                            </div>
                            <button
                                onClick={() => setConfirmarExclusao(b.id)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10"
                                aria-label="Remover bloqueio"
                            >
                                <Trash2 size={18} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* Modal de criação */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 sm:max-w-md sm:rounded-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Bloquear horário</h3>
                            <button
                                onClick={() => setModalAberto(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={salvar} className="flex flex-col gap-4">
                            {ehDono && (
                                <div>
                                    <label className="mb-1 block text-sm text-zinc-400">Quem fica indisponível</label>
                                    <select
                                        value={form.profissionalId}
                                        onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
                                        className={inputClasses}
                                    >
                                        <option value="">Barbearia inteira</option>
                                        {profissionais.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Início</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={form.inicio}
                                    onChange={(e) => setForm({ ...form, inicio: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Fim</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={form.fim}
                                    onChange={(e) => setForm({ ...form, fim: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Motivo (opcional)</label>
                                <input
                                    value={form.motivo}
                                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                                    placeholder="Almoço, folga, férias…"
                                    className={inputClasses}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={salvando}
                                className="mt-1 w-full rounded-xl bg-yellow-400 py-3 font-bold text-zinc-900 transition-colors hover:bg-yellow-300 disabled:opacity-60"
                            >
                                {salvando ? 'Salvando...' : 'Bloquear'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                aberto={confirmarExclusao !== null}
                titulo="Remover bloqueio"
                mensagem="Esse horário voltará a aceitar agendamentos. Confirma?"
                textoConfirmar="Remover"
                variante="warning"
                onConfirmar={() => confirmarExclusao && remover(confirmarExclusao)}
                onCancelar={() => setConfirmarExclusao(null)}
            />
        </section>
    )
}
