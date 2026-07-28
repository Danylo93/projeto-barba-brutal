'use client'

import { useState, useEffect } from 'react'
import { Key, Copy, CheckCircle2, ShieldAlert, Code2 } from 'lucide-react'
import Cabecalho from '@/components/shared/Cabecalho'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'
import { motion } from 'framer-motion'

export default function ApiKeyPage() {
    const { usuario } = useSessao()
    const { httpGet, httpPost } = useAPI()
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [copiado, setCopiado] = useState(false)
    const [gerando, setGerando] = useState(false)

    const isTenant = usuario?.tipo === 'tenant'

    useEffect(() => {
        if (isTenant) {
            carregarTenant()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTenant])

    const carregarTenant = async () => {
        try {
            setLoading(true)
            const res = await httpGet('tenants/me')
            if (res?.apiKey) setApiKey(res.apiKey)
        } catch (error) {
            console.error('Erro ao carregar tenant:', error)
        } finally {
            setLoading(false)
        }
    }

    const gerarApiKey = async () => {
        try {
            setGerando(true)
            const res = await httpPost('tenants/me/api-key', {})
            if (res?.apiKey) {
                setApiKey(res.apiKey)
            }
        } catch (error) {
            console.error('Erro ao gerar API Key:', error)
        } finally {
            setGerando(false)
        }
    }

    const copiarChave = () => {
        if (apiKey) {
            navigator.clipboard.writeText(apiKey)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
        }
    }

    if (!isTenant) {
        return (
            <div className="flex flex-col bg-zinc-900 min-h-screen">
                <Cabecalho titulo="API Personalizada" descricao="Acesso restrito ao dono da barbearia." />
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-zinc-900 min-h-screen pb-16">
            <Cabecalho
                titulo="API Personalizada"
                descricao="Integre seu sistema ou site próprio com a Barbearia Brutal."
            />
            <div className="container py-10 px-4 md:px-0 max-w-4xl mx-auto space-y-10">
                
                {/* Seção da Chave */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/80 pb-6">
                        <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                            <Key size={24} className="text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Sua Chave de API</h2>
                            <p className="text-sm text-zinc-400">Utilize esta chave para autenticar requisições na nossa API.</p>
                        </div>
                    </div>

                    {!apiKey && !loading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-950/50 rounded-xl border border-zinc-800">
                            <ShieldAlert size={48} className="text-zinc-700 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">Nenhuma Chave Gerada</h3>
                            <p className="text-zinc-500 mb-6 max-w-sm">
                                Você ainda não possui uma API Key. Gere uma agora para começar a usar a API da Barbearia Brutal.
                            </p>
                            <button
                                onClick={gerarApiKey}
                                disabled={gerando}
                                className="bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-colors"
                            >
                                {gerando ? 'Gerando...' : 'Gerar Nova Chave API'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-zinc-300">Bearer Token de Autenticação</label>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-yellow-400 overflow-x-auto">
                                    {loading ? 'Carregando...' : apiKey}
                                </div>
                                <button
                                    onClick={copiarChave}
                                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white p-4 rounded-xl transition-colors flex items-center gap-2"
                                >
                                    {copiado ? <CheckCircle2 size={20} className="text-green-400" /> : <Copy size={20} />}
                                </button>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={gerarApiKey}
                                    disabled={gerando}
                                    className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                                >
                                    Revogar e Gerar Nova Chave
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Seção de Documentação */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/80 pb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
                            <Code2 size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Documentação da API</h2>
                            <p className="text-sm text-zinc-400">Exemplos de como integrar seu sistema.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-sm">GET</span> 
                                Listar Agendamentos de Hoje
                            </h3>
                            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-sm text-zinc-300">
                                <code>{`fetch('https://api.barbabrutal.app/agendamentos/hoje', {
  headers: {
    'Authorization': 'Bearer SEU_TOKEN_API'
  }
})`}</code>
                            </pre>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-sm">POST</span> 
                                Criar Novo Agendamento
                            </h3>
                            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-sm text-zinc-300">
                                <code>{`fetch('https://api.barbabrutal.app/agendamentos', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer SEU_TOKEN_API',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: "2026-07-29T14:30:00Z",
    profissionalId: 1,
    servicoIds: [1, 2],
    telefoneCliente: "11999999999"
  })
})`}</code>
                            </pre>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    )
}
