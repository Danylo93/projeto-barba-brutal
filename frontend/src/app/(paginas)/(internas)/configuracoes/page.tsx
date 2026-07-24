'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, Loader2, Copy } from 'lucide-react'
import { motion } from 'framer-motion'
import useSessao from '@/data/hooks/useSessao'
import useAPI from '@/data/hooks/useAPI'
import Cabecalho from '@/components/shared/Cabecalho'
import { useToast } from '@/hooks/use-toast'
import {
    DiaHorario,
    horarioDoDia,
    HORA_ABERTURA_PADRAO,
    HORA_FECHAMENTO_PADRAO,
} from '@/lib/agendamento-utils'

const DIAS_SEMANA = [
    { id: 0, nome: 'Domingo', curto: 'Dom' },
    { id: 1, nome: 'Segunda-feira', curto: 'Seg' },
    { id: 2, nome: 'Terça-feira', curto: 'Ter' },
    { id: 3, nome: 'Quarta-feira', curto: 'Qua' },
    { id: 4, nome: 'Quinta-feira', curto: 'Qui' },
    { id: 5, nome: 'Sexta-feira', curto: 'Sex' },
    { id: 6, nome: 'Sábado', curto: 'Sáb' },
]

// Horário padrão inicial: seg a sáb aberto, domingo fechado.
function horariosPadrao(): DiaHorario[] {
    return DIAS_SEMANA.map((d) => ({
        dia: d.id,
        aberto: d.id !== 0,
        abertura: HORA_ABERTURA_PADRAO,
        fechamento: HORA_FECHAMENTO_PADRAO,
    }))
}

export default function ConfiguracoesPage() {
    const { token } = useSessao()
    const { httpGet, httpPut } = useAPI()
    const { success: toastSuccess, error: toastError } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [sucesso, setSucesso] = useState(false)

    const [horarios, setHorarios] = useState<DiaHorario[]>(horariosPadrao())

    useEffect(() => {
        if (token) fetchConfiguracoes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    const fetchConfiguracoes = async () => {
        try {
            setLoading(true)
            const response = await httpGet('tenants/me')
            const conf = response?.configuracoes
            // Deriva o horário de cada dia (aceita formato novo e o antigo).
            setHorarios(DIAS_SEMANA.map((d) => horarioDoDia(conf, d.id)))
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido'
            setError(msg)
            toastError('Erro ao carregar', msg)
        } finally {
            setLoading(false)
        }
    }

    const atualizarDia = (dia: number, campo: Partial<DiaHorario>) => {
        setHorarios((prev) => prev.map((h) => (h.dia === dia ? { ...h, ...campo } : h)))
    }

    // Copia o horário de um dia para todos os outros dias abertos.
    const aplicarEmTodos = (origem: DiaHorario) => {
        setHorarios((prev) =>
            prev.map((h) =>
                h.aberto ? { ...h, abertura: origem.abertura, fechamento: origem.fechamento } : h,
            ),
        )
        toastSuccess('Horário aplicado', 'O mesmo horário foi copiado para todos os dias abertos.')
    }

    const salvarConfiguracoes = async () => {
        // Validação simples: fechamento depois da abertura nos dias abertos.
        const invalido = horarios.find((h) => h.aberto && h.abertura >= h.fechamento)
        if (invalido) {
            const nome = DIAS_SEMANA.find((d) => d.id === invalido.dia)?.nome
            const msg = `Em ${nome}, o horário de fechamento deve ser depois da abertura.`
            setError(msg)
            toastError('Horário inválido', msg)
            return
        }

        try {
            setSaving(true)
            setError('')
            setSucesso(false)

            const diasAbertos = horarios.filter((h) => h.aberto).map((h) => h.dia)
            const configuracoes = {
                horarios,
                // Mantém as chaves antigas por compatibilidade com leitores legados.
                diasAbertos,
                horaAbertura: (horarios.find((h) => h.aberto) ?? horarios[1]).abertura,
                horaFechamento: (horarios.find((h) => h.aberto) ?? horarios[1]).fechamento,
            }

            const response = await httpPut('tenants/me/configuracoes', configuracoes)

            if (response && (response.statusCode >= 400 || response.message)) {
                throw new Error(response.message || 'Erro ao salvar configurações')
            }

            setSucesso(true)
            toastSuccess('Configurações salvas', 'Seus horários foram atualizados.')
            setTimeout(() => setSucesso(false), 3000)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido'
            setError(msg)
            toastError('Erro ao salvar', msg)
        } finally {
            setSaving(false)
        }
    }

    const algumDiaAberto = horarios.some((h) => h.aberto)

    if (loading) {
        return (
            <div className="min-h-[60vh] bg-zinc-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-yellow-400" size={40} />
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-zinc-900 min-h-screen pb-16">
            <Cabecalho
                titulo="Configurações da Barbearia"
                descricao="Defina o horário de funcionamento de cada dia da semana."
            />
            <div className="container max-w-3xl mx-auto py-10 px-4">

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-950/40 border border-red-900/60 text-red-300 px-4 py-3 rounded-xl mb-6 flex items-center gap-2.5 backdrop-blur-sm"
                    >
                        <AlertCircle size={18} className="flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </motion.div>
                )}

                {sucesso && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-950/40 border border-green-900/60 text-green-300 px-4 py-3 rounded-xl mb-6 flex items-center gap-2.5 backdrop-blur-sm"
                    >
                        <span className="text-sm font-semibold">Configurações salvas com sucesso!</span>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-6 sm:p-8"
                >
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800/80">
                        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                            <Settings size={20} className="text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Horário de Funcionamento</h2>
                            <p className="text-sm text-zinc-500">Cada dia pode ter um horário diferente.</p>
                        </div>
                    </div>

                    <div className="flex flex-col divide-y divide-zinc-800/70">
                        {horarios.map((h) => {
                            const dia = DIAS_SEMANA.find((d) => d.id === h.dia)!
                            return (
                                <div
                                    key={h.dia}
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4"
                                >
                                    {/* Toggle aberto/fechado */}
                                    <button
                                        type="button"
                                        onClick={() => atualizarDia(h.dia, { aberto: !h.aberto })}
                                        className="flex items-center gap-3 sm:w-48 shrink-0 text-left"
                                    >
                                        <span
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                                h.aberto ? 'bg-yellow-400' : 'bg-zinc-700'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    h.aberto ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </span>
                                        <span className="flex flex-col leading-tight">
                                            <span className="text-sm font-semibold text-white">{dia.nome}</span>
                                            <span
                                                className={`text-xs ${
                                                    h.aberto ? 'text-yellow-400/80' : 'text-zinc-500'
                                                }`}
                                            >
                                                {h.aberto ? 'Aberto' : 'Fechado'}
                                            </span>
                                        </span>
                                    </button>

                                    {/* Horários do dia */}
                                    {h.aberto ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <input
                                                type="time"
                                                value={h.abertura}
                                                onChange={(e) => atualizarDia(h.dia, { abertura: e.target.value })}
                                                className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                                            />
                                            <span className="text-zinc-500 text-sm">até</span>
                                            <input
                                                type="time"
                                                value={h.fechamento}
                                                onChange={(e) => atualizarDia(h.dia, { fechamento: e.target.value })}
                                                className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => aplicarEmTodos(h)}
                                                title="Aplicar este horário a todos os dias abertos"
                                                className="ml-1 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-yellow-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800/60"
                                            >
                                                <Copy size={13} />
                                                <span className="hidden sm:inline">Aplicar a todos</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-zinc-600 italic">Sem atendimento</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-800/80 flex justify-end">
                        <button
                            onClick={salvarConfiguracoes}
                            disabled={saving || !algumDiaAberto}
                            className="inline-flex items-center gap-2 bg-yellow-400 text-zinc-900 px-6 py-3 rounded-xl
                                font-bold hover:bg-yellow-300 active:scale-[0.98] transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                shadow-[0_0_20px_rgba(250,204,21,0.15)]"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Configurações
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
