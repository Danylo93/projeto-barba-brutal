'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Crown } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'

interface Plano {
  id: number
  nome: string
  descricao: string
  preco: number
  duracao: number
  maxUsuarios: number
  maxAgendamentos: number
  features: string[]
  ativo: boolean
}

export default function PlanosPage() {
  const router = useRouter()
  const { httpGet, httpPost } = useAPI()
  const { usuario } = useUsuario()
  const isTenant = usuario?.tipo === 'tenant'

  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoAtualId, setPlanoAtualId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvandoId, setSalvandoId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      const listaPlanos = await httpGet('/planos')
      setPlanos((Array.isArray(listaPlanos) ? listaPlanos : []).filter((p: Plano) => p.ativo))

      if (isTenant) {
        const assinatura = await httpGet('/assinaturas/me')
        if (assinatura?.planoId) setPlanoAtualId(assinatura.planoId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }, [httpGet, isTenant])

  useEffect(() => {
    carregar()
  }, [carregar])

  const trocarPlano = async (plano: Plano) => {
    if (!isTenant || plano.id === planoAtualId) return
    if (!confirm(`Mudar para o plano ${plano.nome} (R$ ${plano.preco.toFixed(2)}/mês)?`)) return

    try {
      setError('')
      setSucesso('')
      setSalvandoId(plano.id)
      const resposta = await httpPost('/assinaturas/me/change-plan', { planoId: plano.id })
      if (resposta?.statusCode >= 400) {
        throw new Error(resposta.message || 'Erro ao trocar de plano')
      }
      setPlanoAtualId(plano.id)
      setSucesso(`Plano alterado para ${plano.nome} com sucesso!`)
      setTimeout(() => router.push('/assinatura'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao trocar de plano')
    } finally {
      setSalvandoId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Planos</h1>
          <p className="text-gray-600 mt-2">
            {isTenant
              ? 'Escolha o plano ideal para a sua barbearia'
              : 'Somente a conta da barbearia pode alterar o plano'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        {sucesso && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle size={20} />
            {sucesso}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planos.map((plano) => {
            const atual = plano.id === planoAtualId
            return (
              <div
                key={plano.id}
                className={`bg-white rounded-lg shadow flex flex-col p-6 border-2 ${
                  atual ? 'border-blue-600' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{plano.nome}</h2>
                  {atual && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      <Crown size={14} /> Plano atual
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">{plano.descricao}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  R$ {plano.preco.toFixed(2).replace('.', ',')}
                  <span className="text-sm font-normal text-gray-500">/{plano.duracao === 30 ? 'mês' : `${plano.duracao} dias`}</span>
                </p>
                <ul className="space-y-2 my-6 flex-1">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                    Até {plano.maxUsuarios} usuários
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                    {plano.maxAgendamentos} agendamentos/mês
                  </li>
                  {plano.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isTenant && (
                  <button
                    onClick={() => trocarPlano(plano)}
                    disabled={atual || salvandoId !== null}
                    className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                      atual
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                    }`}
                  >
                    {atual
                      ? 'Plano atual'
                      : salvandoId === plano.id
                        ? 'Alterando...'
                        : 'Escolher este plano'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
