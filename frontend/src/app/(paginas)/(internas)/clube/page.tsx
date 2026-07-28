'use client'

/**
 * Clube de assinatura.
 * - Dono: configura a chave Pix, cria planos e confirma os pagamentos.
 * - Cliente: vê os planos e assina (recebe o Pix copia e cola).
 */

import { useCallback, useEffect, useState } from 'react'
import { Crown, Plus, Trash2, X, Check, Copy, Clock, Users, Wallet } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'
import Cabecalho from '@/components/shared/Cabecalho'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import ConfirmModal from '@/components/shared/ConfirmModal'

interface PlanoClube {
    id: number
    nome: string
    descricao?: string | null
    preco: number
    beneficios: string[]
    ativo: boolean
    _count?: { assinaturas: number }
}

interface Assinatura {
    id: number
    status: string
    valor: number
    pixCopiaECola?: string | null
    inicio?: string | null
    fim?: string | null
    usuario?: { id: number; nome: string; email: string; telefone?: string }
    plano?: { id: number; nome: string; beneficios?: string[] }
}

interface Resumo {
    assinantesAtivos: number
    pagamentosPendentes: number
    planosAtivos: number
    receitaRecorrente: number
}

const dinheiro = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const input =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-white ' +
    'focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400'

export default function ClubePage() {
    const { usuario } = useUsuario()
    const ehDono = usuario?.tipo === 'tenant'

    return (
        <div className="flex min-h-screen flex-col bg-zinc-900">
            <Cabecalho
                titulo="Clube de Assinatura"
                descricao={
                    ehDono
                        ? 'Receita recorrente: crie planos e receba por Pix.'
                        : 'Assine um plano e economize nos seus atendimentos.'
                }
            />
            <div className="container mx-auto max-w-5xl px-4 py-10 md:px-0">
                {ehDono ? <VisaoDono /> : <VisaoCliente />}
            </div>
        </div>
    )
}

/* ============================== DONO ============================== */

function VisaoDono() {
    const { httpGet, httpPost, httpPut, httpDelete } = useAPI()
    const { success, error: toastErro } = useToast()

    const [planos, setPlanos] = useState<PlanoClube[]>([])
    const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
    const [resumo, setResumo] = useState<Resumo | null>(null)
    const [chavePix, setChavePix] = useState('')
    const [carregando, setCarregando] = useState(true)
    const [modal, setModal] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [excluir, setExcluir] = useState<number | null>(null)
    const [form, setForm] = useState({ nome: '', descricao: '', preco: '', beneficios: '' })

    const carregar = useCallback(async () => {
        try {
            setCarregando(true)
            const [p, a, r, tenant] = await Promise.all([
                httpGet('clube/planos'),
                httpGet('clube/assinaturas'),
                httpGet('clube/resumo'),
                httpGet('tenants/me'),
            ])
            setPlanos(Array.isArray(p) ? p : [])
            setAssinaturas(Array.isArray(a) ? a : [])
            setResumo(r?.assinantesAtivos !== undefined ? r : null)
            setChavePix(tenant?.chavePix ?? '')
        } catch (e) {
            toastErro('Erro ao carregar', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setCarregando(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [httpGet])

    useEffect(() => {
        carregar()
    }, [carregar])

    async function salvarChave() {
        try {
            const r = await httpPut('clube/chave-pix', { chavePix })
            if (r?.statusCode >= 400) throw new Error(r.message)
            success('Chave Pix salva', 'Os pagamentos do clube caem direto na sua conta.')
        } catch (e) {
            toastErro('Chave inválida', e instanceof Error ? e.message : 'Confira e tente de novo.')
        }
    }

    async function salvarPlano(e: React.FormEvent) {
        e.preventDefault()
        try {
            setSalvando(true)
            const r = await httpPost('clube/planos', {
                nome: form.nome,
                descricao: form.descricao || undefined,
                preco: Number(String(form.preco).replace(',', '.')),
                beneficios: form.beneficios.split('\n').map((b) => b.trim()).filter(Boolean),
            })
            if (r?.statusCode >= 400 || (r?.message && !r?.id)) {
                throw new Error(r.message || 'Não foi possível criar o plano.')
            }
            success('Plano criado', 'Já aparece para os seus clientes.')
            setModal(false)
            setForm({ nome: '', descricao: '', preco: '', beneficios: '' })
            await carregar()
        } catch (e) {
            toastErro('Erro ao criar plano', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setSalvando(false)
        }
    }

    async function confirmar(id: number) {
        try {
            await httpPost(`clube/assinaturas/${id}/confirmar`, {})
            success('Pagamento confirmado', 'A assinatura está ativa por 30 dias.')
            await carregar()
        } catch (e) {
            toastErro('Erro ao confirmar', e instanceof Error ? e.message : 'Tente novamente.')
        }
    }

    async function removerPlano(id: number) {
        setExcluir(null)
        try {
            await httpDelete(`clube/planos/${id}`)
            success('Plano removido', 'Ele não aparece mais para novos assinantes.')
            await carregar()
        } catch (e) {
            toastErro('Erro ao remover', e instanceof Error ? e.message : 'Tente novamente.')
        }
    }

    if (carregando) return <Skeleton className="h-64 w-full" />

    const pendentes = assinaturas.filter((a) => a.status === 'pendente')
    const ativas = assinaturas.filter((a) => a.status === 'ativa')

    return (
        <div className="flex flex-col gap-10">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Indicador icone={<Users size={16} />} rotulo="Assinantes" valor={String(resumo?.assinantesAtivos ?? 0)} />
                <Indicador
                    icone={<Wallet size={16} />}
                    rotulo="Receita recorrente"
                    valor={dinheiro(resumo?.receitaRecorrente ?? 0)}
                    cor="text-green-400"
                />
                <Indicador
                    icone={<Clock size={16} />}
                    rotulo="Aguardando Pix"
                    valor={String(resumo?.pagamentosPendentes ?? 0)}
                    cor={(resumo?.pagamentosPendentes ?? 0) > 0 ? 'text-amber-400' : undefined}
                />
                <Indicador icone={<Crown size={16} />} rotulo="Planos ativos" valor={String(resumo?.planosAtivos ?? 0)} />
            </div>

            {/* Chave Pix */}
            <section>
                <h2 className="mb-1 text-lg font-bold text-white">Sua chave Pix</h2>
                <p className="mb-3 text-sm text-zinc-500">
                    Os pagamentos do clube vão direto para a sua conta — o sistema só gera o código.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        value={chavePix}
                        onChange={(e) => setChavePix(e.target.value)}
                        placeholder="CPF, CNPJ, e-mail, +5511… ou chave aleatória"
                        className={input}
                    />
                    <button
                        onClick={salvarChave}
                        className="shrink-0 rounded-lg bg-yellow-400 px-5 py-2.5 font-bold text-zinc-900 transition-colors hover:bg-yellow-300"
                    >
                        Salvar
                    </button>
                </div>
            </section>

            {/* Planos */}
            <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-white">Planos do clube</h2>
                    <button
                        onClick={() => setModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-zinc-900 transition-transform hover:bg-yellow-300 active:scale-95"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Novo plano</span>
                    </button>
                </div>

                {planos.length === 0 ? (
                    <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
                        Nenhum plano ainda. Crie um para começar a ter receita recorrente.
                    </p>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {planos.map((p) => (
                            <li
                                key={p.id}
                                className={`rounded-xl border p-4 ${
                                    p.ativo ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-800/60 bg-zinc-900/30 opacity-60'
                                }`}
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-bold text-white">{p.nome}</h3>
                                        <p className="text-xl font-black text-yellow-400">
                                            {dinheiro(p.preco)}
                                            <span className="text-xs font-normal text-zinc-500">/mês</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setExcluir(p.id)}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
                                        aria-label={`Remover ${p.nome}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {p.descricao && <p className="mb-2 text-sm text-zinc-400">{p.descricao}</p>}
                                {p.beneficios?.length > 0 && (
                                    <ul className="flex flex-col gap-1">
                                        {p.beneficios.map((b) => (
                                            <li key={b} className="flex items-start gap-1.5 text-sm text-zinc-400">
                                                <Check size={14} className="mt-0.5 shrink-0 text-green-400" />
                                                {b}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="mt-3 text-xs text-zinc-500">
                                    {p._count?.assinaturas ?? 0} assinatura(s){!p.ativo && ' · inativo'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Pagamentos aguardando confirmação */}
            {pendentes.length > 0 && (
                <section>
                    <h2 className="mb-1 text-lg font-bold text-white">Aguardando confirmação do Pix</h2>
                    <p className="mb-3 text-sm text-zinc-500">
                        Confira o recebimento no seu banco e confirme aqui para ativar a assinatura.
                    </p>
                    <ul className="flex flex-col gap-3">
                        {pendentes.map((a) => (
                            <li
                                key={a.id}
                                className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-white">{a.usuario?.nome}</p>
                                    <p className="truncate text-sm text-zinc-400">
                                        {a.plano?.nome} · {dinheiro(a.valor)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => confirmar(a.id)}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-bold text-zinc-900 transition-colors hover:bg-green-400"
                                >
                                    <Check size={16} />
                                    Confirmar
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Assinantes ativos */}
            {ativas.length > 0 && (
                <section>
                    <h2 className="mb-3 text-lg font-bold text-white">Assinantes ativos</h2>
                    <ul className="flex flex-col gap-2">
                        {ativas.map((a) => (
                            <li
                                key={a.id}
                                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                                    <Crown size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-white">{a.usuario?.nome}</p>
                                    <p className="truncate text-sm text-zinc-500">
                                        {a.plano?.nome}
                                        {a.fim && ` · até ${new Date(a.fim).toLocaleDateString('pt-BR')}`}
                                    </p>
                                </div>
                                <span className="shrink-0 font-bold text-green-400">{dinheiro(a.valor)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Modal de novo plano */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 sm:max-w-md sm:rounded-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Novo plano</h3>
                            <button
                                onClick={() => setModal(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={salvarPlano} className="flex flex-col gap-4">
                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Nome</label>
                                <input
                                    required
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    placeholder="Ex.: Clube Corte Livre"
                                    className={input}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Preço mensal (R$)</label>
                                <input
                                    required
                                    inputMode="decimal"
                                    value={form.preco}
                                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                                    placeholder="99,90"
                                    className={input}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Descrição (opcional)</label>
                                <input
                                    value={form.descricao}
                                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                    className={input}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-zinc-400">Benefícios (um por linha)</label>
                                <textarea
                                    rows={4}
                                    value={form.beneficios}
                                    onChange={(e) => setForm({ ...form, beneficios: e.target.value })}
                                    placeholder={'4 cortes por mês\nBarba com desconto\nPrioridade na agenda'}
                                    className={input}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={salvando}
                                className="mt-1 w-full rounded-xl bg-yellow-400 py-3 font-bold text-zinc-900 hover:bg-yellow-300 disabled:opacity-60"
                            >
                                {salvando ? 'Salvando...' : 'Criar plano'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                aberto={excluir !== null}
                titulo="Remover plano"
                mensagem="Se já houver assinantes ativos, o plano será apenas desativado. Confirma?"
                textoConfirmar="Remover"
                variante="warning"
                onConfirmar={() => excluir && removerPlano(excluir)}
                onCancelar={() => setExcluir(null)}
            />
        </div>
    )
}

/* ============================= CLIENTE ============================= */

function VisaoCliente() {
    const { httpGet, httpPost } = useAPI()
    const { success, error: toastErro } = useToast()
    const [planos, setPlanos] = useState<PlanoClube[]>([])
    const [minhas, setMinhas] = useState<Assinatura[]>([])
    const [carregando, setCarregando] = useState(true)
    const [assinando, setAssinando] = useState<number | null>(null)
    const [cancelar, setCancelar] = useState<Assinatura | null>(null)

    const carregar = useCallback(async () => {
        try {
            setCarregando(true)
            const [p, m] = await Promise.all([
                httpGet('clube/planos'),
                httpGet('clube/minhas-assinaturas'),
            ])
            setPlanos(Array.isArray(p) ? p : [])
            setMinhas(Array.isArray(m) ? m : [])
        } catch (e) {
            toastErro('Erro ao carregar', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setCarregando(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [httpGet])

    useEffect(() => {
        carregar()
    }, [carregar])

    async function assinar(planoId: number) {
        try {
            setAssinando(planoId)
            const r = await httpPost(`clube/assinar/${planoId}`, {})
            if (r?.statusCode >= 400 || (r?.message && !r?.id)) {
                throw new Error(r.message || 'Não foi possível assinar.')
            }
            success('Quase lá!', 'Pague o Pix para ativar sua assinatura.')
            await carregar()
        } catch (e) {
            toastErro('Não foi possível assinar', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setAssinando(null)
        }
    }

    function copiar(texto: string) {
        navigator.clipboard?.writeText(texto)
        success('Pix copiado', 'Cole no app do seu banco para pagar.')
    }

    async function cancelarAssinatura(a: Assinatura) {
        setCancelar(null)
        try {
            await httpPost(`clube/assinaturas/${a.id}/cancelar`, {})
            success(
                a.status === 'pendente' ? 'Contratação cancelada' : 'Assinatura cancelada',
                'Você pode assinar de novo quando quiser.',
            )
            await carregar()
        } catch (e) {
            toastErro('Erro ao cancelar', e instanceof Error ? e.message : 'Tente novamente.')
        }
    }

    if (carregando) return <Skeleton className="h-64 w-full" />

    const pendente = minhas.find((a) => a.status === 'pendente')
    const ativa = minhas.find((a) => a.status === 'ativa')

    return (
        <div className="flex flex-col gap-8">
            {ativa && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
                    <div className="flex items-center gap-2 text-green-400">
                        <Crown size={20} />
                        <h2 className="font-bold">Você é assinante do {ativa.plano?.nome}</h2>
                    </div>
                    {ativa.fim && (
                        <p className="mt-1 text-sm text-zinc-400">
                            Válido até {new Date(ativa.fim).toLocaleDateString('pt-BR')}
                        </p>
                    )}
                    {/* Lembra o cliente do que ele tem direito. */}
                    {(ativa.plano?.beneficios?.length ?? 0) > 0 && (
                        <ul className="mt-4 flex flex-col gap-1.5">
                            {ativa.plano!.beneficios!.map((b) => (
                                <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                                    <Check size={15} className="mt-0.5 shrink-0 text-green-400" />
                                    {b}
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        onClick={() => setCancelar(ativa)}
                        className="mt-4 text-sm text-zinc-500 underline underline-offset-4 hover:text-red-400"
                    >
                        Cancelar assinatura
                    </button>
                </div>
            )}

            {pendente?.pixCopiaECola && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <h2 className="font-bold text-amber-400">Pague para ativar</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                        {pendente.plano?.nome} · {dinheiro(pendente.valor)} — copie o código e pague no seu banco.
                        A barbearia confirma e sua assinatura ativa.
                    </p>
                    <div className="mt-3 break-all rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400">
                        {pendente.pixCopiaECola}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => copiar(pendente.pixCopiaECola!)}
                            className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-yellow-300"
                        >
                            <Copy size={16} />
                            Copiar código Pix
                        </button>
                        <button
                            onClick={() => setCancelar(pendente)}
                            className="text-sm text-zinc-500 underline underline-offset-4 hover:text-red-400"
                        >
                            Desistir
                        </button>
                    </div>
                </div>
            )}

            {!ativa && !pendente && (
                <section>
                    <h2 className="mb-4 text-lg font-bold text-white">Planos disponíveis</h2>
                    {planos.length === 0 ? (
                        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
                            Esta barbearia ainda não tem clube de assinatura.
                        </p>
                    ) : (
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {planos.map((p) => (
                                <li key={p.id} className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                                    <h3 className="font-bold text-white">{p.nome}</h3>
                                    <p className="mb-3 text-2xl font-black text-yellow-400">
                                        {dinheiro(p.preco)}
                                        <span className="text-xs font-normal text-zinc-500">/mês</span>
                                    </p>
                                    {p.descricao && <p className="mb-3 text-sm text-zinc-400">{p.descricao}</p>}
                                    {p.beneficios?.length > 0 && (
                                        <ul className="mb-4 flex flex-1 flex-col gap-1.5">
                                            {p.beneficios.map((b) => (
                                                <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                                                    <Check size={15} className="mt-0.5 shrink-0 text-green-400" />
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <button
                                        onClick={() => assinar(p.id)}
                                        disabled={assinando === p.id}
                                        className="mt-auto w-full rounded-xl bg-yellow-400 py-3 font-bold text-zinc-900 hover:bg-yellow-300 disabled:opacity-60"
                                    >
                                        {assinando === p.id ? 'Gerando Pix...' : 'Assinar'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <ConfirmModal
                aberto={cancelar !== null}
                titulo={cancelar?.status === 'pendente' ? 'Desistir da contratação' : 'Cancelar assinatura'}
                mensagem={
                    cancelar?.status === 'pendente'
                        ? 'O código Pix deixa de valer. Se já pagou, fale com a barbearia antes de desistir.'
                        : 'Você perde os benefícios do clube imediatamente. Confirma?'
                }
                textoConfirmar={cancelar?.status === 'pendente' ? 'Desistir' : 'Cancelar assinatura'}
                variante="warning"
                onConfirmar={() => cancelar && cancelarAssinatura(cancelar)}
                onCancelar={() => setCancelar(null)}
            />
        </div>
    )
}

function Indicador({
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
                <span className="truncate text-[10px] font-semibold uppercase tracking-wider">{rotulo}</span>
            </div>
            <p className={`truncate text-lg font-black tabular-nums ${cor}`}>{valor}</p>
        </div>
    )
}
