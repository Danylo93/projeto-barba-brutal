'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Plano } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ plano, tenantId }: { plano: Plano; tenantId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Criar sessão de checkout
      const response = await fetch('/api/assinaturas/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          planoId: plano.id,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout/cancel`,
        }),
      })

      const { sessionId } = await response.json()

      if (!response.ok) {
        throw new Error('Erro ao criar sessão de checkout')
      }

      // Carregar Stripe e redirecionar
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe não carregado')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })

      if (error) {
        setError(error.message || 'Erro no checkout')
      }
    } catch (err: any) {
      setError(err.message || 'Erro interno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo do Plano</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Plano:</span>
            <span className="font-semibold">{plano.nome}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Preço:</span>
            <span className="font-semibold">R$ {plano.preco.toFixed(2).replace('.', ',')}/mês</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Usuários:</span>
            <span className="font-semibold">{plano.maxUsuarios === 999999 ? 'Ilimitado' : plano.maxUsuarios}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Agendamentos:</span>
            <span className="font-semibold">{plano.maxAgendamentos === 999999 ? 'Ilimitado' : plano.maxAgendamentos}/mês</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-blue-600 text-sm">
          <strong>Período de teste:</strong> Você terá 14 dias gratuitos para testar o plano. 
          Após esse período, será cobrado automaticamente.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
      >
        {loading ? 'Processando...' : `Assinar ${plano.nome} - R$ ${plano.preco.toFixed(2).replace('.', ',')}/mês`}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [plano, setPlano] = useState<Plano | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const planoId = searchParams.get('planoId')
  const tenantId = searchParams.get('tenantId')

  useEffect(() => {
    if (!planoId || !tenantId) {
      router.push('/')
      return
    }

    async function fetchPlano() {
      try {
        const response = await fetch(`/api/planos/${planoId}`)
        if (!response.ok) {
          throw new Error('Plano não encontrado')
        }
        const data = await response.json()
        setPlano(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPlano()
  }, [planoId, tenantId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    )
  }

  if (error || !plano) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">{error || 'Plano não encontrado'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Finalizar Assinatura</h1>
          <p className="text-gray-600">Complete seu pagamento para ativar sua conta</p>
        </div>

        <CheckoutForm plano={plano} tenantId={+tenantId!} />
      </div>
    </div>
  )
}
