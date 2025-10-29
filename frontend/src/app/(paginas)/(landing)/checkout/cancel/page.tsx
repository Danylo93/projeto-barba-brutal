'use client'
import Link from 'next/link'

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Pagamento Cancelado
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            Seu pagamento foi cancelado. Não se preocupe, você pode tentar novamente a qualquer momento.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-yellow-800 mb-2">O que aconteceu?</h3>
            <ul className="text-yellow-700 text-sm space-y-1 text-left">
              <li>• O processo de pagamento foi interrompido</li>
              <li>• Nenhuma cobrança foi realizada</li>
              <li>• Você pode tentar novamente quando quiser</li>
              <li>• Seus dados estão seguros</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-block w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 font-semibold"
            >
              Escolher Plano Novamente
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
              Dúvidas sobre os planos? Entre em contato conosco em{' '}
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
