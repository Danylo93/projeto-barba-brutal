'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import useSessao from '@/data/hooks/useSessao'
import useAPI from '@/data/hooks/useAPI'
import Cabecalho from '@/components/shared/Cabecalho'
import { useToast } from '@/hooks/use-toast'

const DIAS_SEMANA = [
    { id: 0, nome: 'Domingo' },
    { id: 1, nome: 'Segunda-feira' },
    { id: 2, nome: 'Terça-feira' },
    { id: 3, nome: 'Quarta-feira' },
    { id: 4, nome: 'Quinta-feira' },
    { id: 5, nome: 'Sexta-feira' },
    { id: 6, nome: 'Sábado' },
]

export default function ConfiguracoesPage() {
    const { token } = useSessao()
    const { httpGet, httpPut } = useAPI()
    const { success: toastSuccess, error: toastError } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [sucesso, setSucesso] = useState(false)

    const [diasAbertos, setDiasAbertos] = useState<number[]>([1, 2, 3, 4, 5, 6])
    const [horaAbertura, setHoraAbertura] = useState('08:00')
    const [horaFechamento, setHoraFechamento] = useState('21:00')

    useEffect(() => {
        if (token) fetchConfiguracoes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    const fetchConfiguracoes = async () => {
        try {
            setLoading(true)
            const response = await httpGet('tenants/me')
            
            if (response && response.configuracoes) {
                const conf = response.configuracoes
                if (conf.diasAbertos) setDiasAbertos(conf.diasAbertos)
                if (conf.horaAbertura) setHoraAbertura(conf.horaAbertura)
                if (conf.horaFechamento) setHoraFechamento(conf.horaFechamento)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido')
        } finally {
            setLoading(false)
        }
    }

    const salvarConfiguracoes = async () => {
        try {
            setSaving(true)
            setError('')
            setSucesso(false)

            const configuracoes = {
                diasAbertos,
                horaAbertura,
                horaFechamento,
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

    const toggleDia = (id: number) => {
        if (diasAbertos.includes(id)) {
            setDiasAbertos(diasAbertos.filter((d) => d !== id))
        } else {
            setDiasAbertos([...diasAbertos, id].sort())
        }
    }

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
                descricao="Defina seus horários e dias de funcionamento." 
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
                        <h2 className="text-xl font-bold text-white tracking-tight">Horário de Funcionamento</h2>
                    </div>

                    <div className="space-y-8">
                        {/* Dias da Semana */}
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
                                Dias Abertos
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {DIAS_SEMANA.map((dia) => {
                                    const ativo = diasAbertos.includes(dia.id)
                                    return (
                                        <button
                                            key={dia.id}
                                            onClick={() => toggleDia(dia.id)}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border
                                                ${ativo 
                                                    ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' 
                                                    : 'bg-zinc-800/30 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/50'
                                                }`}
                                        >
                                            {dia.nome}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Horários */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                                    Horário de Abertura
                                </label>
                                <input
                                    type="time"
                                    value={horaAbertura}
                                    onChange={(e) => setHoraAbertura(e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                                    Horário de Fechamento
                                </label>
                                <input
                                    type="time"
                                    value={horaFechamento}
                                    onChange={(e) => setHoraFechamento(e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-zinc-800/80 flex justify-end">
                        <button
                            onClick={salvarConfiguracoes}
                            disabled={saving || diasAbertos.length === 0}
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
