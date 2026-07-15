'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    CreditCard,
    Calendar,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Clock,
    ArrowRight,
    Sparkles,
    Shield,
    Zap,
    TrendingUp,
    Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import useSessao from '@/data/hooks/useSessao'
import useTrialStatus from '@/hooks/useTrialStatus'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useToast } from '@/hooks/use-toast'

interface Assinatura {
  id: number
  status: string
  emTeste?: boolean
  dataInicio: string
  dataFim: string
  renovacaoAutomatica: boolean
  plano: {
    id: number
    nome: string
    descricao: string
    preco: number
    duracao: number
    maxUsuarios: number
    maxAgendamentos: number
    features: string[]
  }
}

// Ícones para features
const featureIcons: Record<string, typeof Shield> = {
  'Segurança': Shield,
  'Velocidade': Zap,
  'Crescimento': TrendingUp,
}

function getFeatureIcon(feature: string) {
  for (const [key, Icon] of Object.entries(featureIcons)) {
    if (feature.toLowerCase().includes(key.toLowerCase())) return Icon
  }
  return CheckCircle
}

export default function AssinaturaPage() {
  const router = useRouter()
  const { token } = useSessao()
  const trial = useTrialStatus()
  const { success, error: toastError } = useToast()
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)

  useEffect(() => {
    if (token) fetchAssinatura()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fetchAssinatura = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/tenants/me', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar assinatura')
      }

      const data = await response.json()
      if (data.assinatura) {
        setAssinatura(data.assinatura)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirmarCancelamento) return

    try {
      const response = await fetch('/api/assinaturas/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura')
      }

      fetchAssinatura()
      success('Assinatura cancelada', 'Sua assinatura foi cancelada com sucesso.')
    } catch (err) {
      toastError('Erro ao cancelar', err instanceof Error ? err.message : 'Erro ao cancelar assinatura')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setConfirmarCancelamento(false)
    }
  }

  // Configuração de urgência do trial
  const urgenciaConfig = {
    safe: {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      progress: 'bg-emerald-400',
      glow: 'border-emerald-800/40',
    },
    warning: {
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      progress: 'bg-amber-400',
      glow: 'border-amber-800/40',
    },
    danger: {
      badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      progress: 'bg-orange-400',
      glow: 'border-orange-800/40',
    },
    critical: {
      badge: 'bg-red-500/15 text-red-400 border-red-500/30',
      progress: 'bg-red-400',
      glow: 'border-red-800/40',
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-800 border-t-yellow-400 mx-auto" />
          </div>
          <p className="text-zinc-400 mt-4 text-sm">Carregando assinatura...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Minha Assinatura
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm sm:text-base">
            Gerencie sua assinatura e plano
          </p>
        </motion.div>

        {/* Error Message */}
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

        {/* No Subscription */}
        {!assinatura && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-8 sm:p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mx-auto mb-5">
              <CreditCard size={28} className="text-zinc-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma assinatura ativa</h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm">
              Escolha um plano para começar a usar todos os recursos do Barba Brutal e
              transformar a gestão da sua barbearia.
            </p>
            <button
              onClick={() => router.push('/planos')}
              className="inline-flex items-center gap-2 bg-yellow-400 text-zinc-900 px-6 py-3 rounded-xl 
                font-bold hover:bg-yellow-300 active:scale-[0.98] transition-all duration-200
                shadow-[0_0_20px_rgba(250,204,21,0.15)]
                hover:shadow-[0_0_30px_rgba(250,204,21,0.25)]"
            >
              Ver Planos
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Active Subscription */}
        {assinatura && (
          <div className="space-y-4 sm:space-y-6">
            {/* Trial Card (se em teste) */}
            {trial.emTeste && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={`bg-zinc-900/60 backdrop-blur-sm border rounded-2xl p-5 sm:p-6 ${urgenciaConfig[trial.urgencia].glow}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                      <Sparkles size={20} className="text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Período de Teste Ativo</h3>
                      <p className="text-xs text-zinc-400">
                        Todas as funcionalidades disponíveis sem restrições
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border self-start ${urgenciaConfig[trial.urgencia].badge}`}
                  >
                    <Clock size={12} />
                    {trial.diasRestantes} dias restantes
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Início do teste</span>
                    <span>{Math.round(trial.percentualUsado)}% usado</span>
                    <span>Fim do teste</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-800/80 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${urgenciaConfig[trial.urgencia].progress}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${trial.percentualUsado}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>
                      {trial.dataInicio?.toLocaleDateString('pt-BR')}
                    </span>
                    <span>
                      {trial.dataFim?.toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {(trial.urgencia === 'critical' || trial.urgencia === 'danger') && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/60">
                    <button
                      onClick={() => router.push('/planos')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl 
                        bg-yellow-400 text-zinc-900 font-bold text-sm
                        hover:bg-yellow-300 active:scale-[0.98] transition-all duration-200
                        shadow-[0_0_20px_rgba(250,204,21,0.15)]"
                    >
                      Assinar Agora — Não Perca Seus Dados
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-5 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {assinatura.plano.nome}
                </h2>
                <div className="flex items-center gap-2">
                  {assinatura.status === 'active' ? (
                    <>
                      <CheckCircle size={20} className="text-green-400" />
                      <span className="text-green-400 font-bold text-sm">Ativa</span>
                    </>
                  ) : assinatura.status === 'trialing' ? (
                    <>
                      <Clock size={20} className="text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm">
                        Em teste ({trial.diasRestantes} dias)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={20} className="text-red-400" />
                      <span className="text-red-400 font-bold text-sm">Inativa</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                {assinatura.plano.descricao}
              </p>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-zinc-800/60">
                <div className="bg-zinc-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar size={14} className="text-zinc-500" />
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Data de Início
                    </p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {new Date(assinatura.dataInicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="bg-zinc-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar size={14} className="text-zinc-500" />
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Data de Término
                    </p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {new Date(assinatura.dataFim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Renewal */}
              <div className="flex items-center gap-2.5 mb-6">
                <RefreshCw size={18} className="text-yellow-400" />
                <span className="text-zinc-300 text-sm">
                  Renovação automática:{' '}
                  <span className="font-bold text-white">
                    {assinatura.renovacaoAutomatica ? 'Ativada' : 'Desativada'}
                  </span>
                </span>
              </div>

              {/* Price */}
              <div className="bg-zinc-800/30 rounded-xl p-5 mb-6 border border-zinc-700/30">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Valor da Assinatura
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm text-zinc-500">R$</span>
                  <span className="text-4xl font-black text-yellow-400 tracking-tight">
                    {assinatura.plano.preco.toFixed(2)}
                  </span>
                  <span className="text-sm text-zinc-500 ml-1">
                    / {assinatura.plano.duracao} dias
                  </span>
                </div>
                {assinatura.status === 'trialing' && (
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-yellow-400" />
                    Cobrança será feita apenas após o período de teste
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/planos')}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 text-zinc-900 
                    px-5 py-3 rounded-xl font-bold text-sm
                    hover:bg-yellow-300 active:scale-[0.98] transition-all duration-200
                    shadow-[0_0_20px_rgba(250,204,21,0.15)]"
                >
                  Mudar Plano
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => setConfirmarCancelamento(true)}
                  className="flex-1 flex items-center justify-center gap-2 
                    bg-red-500/10 text-red-400 border border-red-500/20
                    px-5 py-3 rounded-xl font-semibold text-sm
                    hover:bg-red-500/20 hover:border-red-500/30 
                    active:scale-[0.98] transition-all duration-200"
                >
                  Cancelar Assinatura
                </button>
              </div>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-5 sm:p-6"
            >
              <h3 className="text-lg sm:text-xl font-black text-white mb-5 tracking-tight">
                Recursos Inclusos
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assinatura.plano.features.map((feature, idx) => {
                  const Icon = getFeatureIcon(feature)
                  return (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="flex items-center gap-3 bg-zinc-800/30 rounded-xl px-4 py-3
                        hover:bg-zinc-800/50 transition-colors duration-200"
                    >
                      <Icon size={16} className="text-green-400 flex-shrink-0" />
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </motion.li>
                  )
                })}
              </ul>
            </motion.div>

            {/* Limits */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-5 sm:p-6"
            >
              <h3 className="text-lg sm:text-xl font-black text-white mb-5 tracking-tight">
                Limites do Plano
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30 hover:border-zinc-600/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users size={14} className="text-blue-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Máx. Usuários
                    </p>
                  </div>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {assinatura.plano.maxUsuarios}
                  </p>
                </div>
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30 hover:border-zinc-600/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Calendar size={14} className="text-purple-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Máx. Agendamentos
                    </p>
                  </div>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {assinatura.plano.maxAgendamentos}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <ConfirmModal
          aberto={confirmarCancelamento}
          titulo="Cancelar Assinatura"
          mensagem="Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium e seu acesso poderá ser bloqueado dependendo da urgência."
          textoConfirmar="Cancelar Assinatura"
          onConfirmar={handleCancelSubscription}
          onCancelar={() => setConfirmarCancelamento(false)}
        />
      </div>
    </div>
  )
}
