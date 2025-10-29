'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface Assinatura {
  id: number
  status: string
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

export default function AssinaturaPage() {
  const router = useRouter()
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAssinatura()
  }, [])

  const fetchAssinatura = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/tenants/me', {
        headers: {
          'Content-Type': 'application/json',
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
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return

    try {
      const response = await fetch('/api/assinaturas/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura')
      }

      fetchAssinatura()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Carregando assinatura...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Minha Assinatura</h1>
          <p className="text-gray-600 mt-2">Gerencie sua assinatura e plano</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* No Subscription */}
        {!assinatura && !error && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma assinatura ativa</h3>
            <p className="text-gray-600 mb-6">Escolha um plano para começar a usar todos os recursos</p>
            <button
              onClick={() => router.push('/planos')}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver Planos
            </button>
          </div>
        )}

        {/* Active Subscription */}
        {assinatura && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{assinatura.plano.nome}</h2>
                <div className="flex items-center gap-2">
                  {assinatura.status === 'active' ? (
                    <>
                      <CheckCircle size={24} className="text-green-600" />
                      <span className="text-green-600 font-semibold">Ativa</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={24} className="text-red-600" />
                      <span className="text-red-600 font-semibold">Inativa</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-6">{assinatura.plano.descricao}</p>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Data de Início</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(assinatura.dataInicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Data de Término</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(assinatura.dataFim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Renewal */}
              <div className="flex items-center gap-2 mb-6">
                <RefreshCw size={20} className="text-blue-600" />
                <span className="text-gray-700">
                  Renovação automática: <span className="font-semibold">
                    {assinatura.renovacaoAutomatica ? 'Ativada' : 'Desativada'}
                  </span>
                </span>
              </div>

              {/* Price */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Valor da Assinatura</p>
                <p className="text-3xl font-bold text-blue-600">
                  R$ {assinatura.plano.preco.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  a cada {assinatura.plano.duracao} dias
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/planos')}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mudar Plano
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Cancelar Assinatura
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recursos Inclusos</h3>
              <ul className="space-y-3">
                {assinatura.plano.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Limites do Plano</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Máximo de Usuários</p>
                  <p className="text-2xl font-bold text-gray-900">{assinatura.plano.maxUsuarios}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Máximo de Agendamentos</p>
                  <p className="text-2xl font-bold text-gray-900">{assinatura.plano.maxAgendamentos}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

