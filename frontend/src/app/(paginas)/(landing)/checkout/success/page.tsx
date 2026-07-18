'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }

    // Aqui você pode verificar o status da sessão no backend
    // Por enquanto, apenas simular sucesso
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }, [sessionId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Pagamento Aprovado! 🎉
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            Sua assinatura foi ativada com sucesso. Você agora tem acesso completo ao sistema.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-green-800 mb-2">O que acontece agora?</h3>
            <ul className="text-green-700 text-sm space-y-1 text-left">
              <li>• Sua conta está ativa e pronta para uso</li>
              <li>• Você tem 14 dias de teste gratuito</li>
              <li>• Após o período de teste, a cobrança será automática</li>
              <li>• Você receberá um email de confirmação em breve</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Link
              href="/dashboard"
              className="inline-block w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 font-semibold"
            >
              Acessar Dashboard
            </Link>

            <Link
              href="/help"
              className="inline-block w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-300 font-semibold"
            >
              Precisa de Ajuda?
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Problemas com o pagamento? Entre em contato conosco em{' '}
              <a href="mailto:suporte@barbabruta.com" className="text-green-600 hover:underline">
                suporte@barbabruta.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
