'use client'

import React from 'react'
import Link from 'next/link'
import subscriptionService, { SubscriptionError } from '@/services/api/subscription.service'

interface SubscriptionErrorModalProps {
  error: SubscriptionError | null
  onClose?: () => void
  showPlansButton?: boolean
}

/**
 * Modal para exibir erros de assinatura
 * Mostra mensagem amigável e oferece opções de ação
 */
export function SubscriptionErrorModal({
  error,
  onClose,
  showPlansButton = true,
}: SubscriptionErrorModalProps) {
  if (!error) return null

  const getIcon = () => {
    switch (error.type) {
      case 'NO_SUBSCRIPTION':
        return '📦'
      case 'EXPIRED_SUBSCRIPTION':
        return '⏰'
      case 'INACTIVE_SUBSCRIPTION':
        return '⚠️'
      default:
        return '❌'
    }
  }

  const getColor = () => {
    switch (error.type) {
      case 'NO_SUBSCRIPTION':
        return 'bg-blue-50 border-blue-200'
      case 'EXPIRED_SUBSCRIPTION':
        return 'bg-orange-50 border-orange-200'
      case 'INACTIVE_SUBSCRIPTION':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-red-50 border-red-200'
    }
  }

  const getButtonColor = () => {
    switch (error.type) {
      case 'NO_SUBSCRIPTION':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'EXPIRED_SUBSCRIPTION':
        return 'bg-orange-600 hover:bg-orange-700'
      case 'INACTIVE_SUBSCRIPTION':
        return 'bg-yellow-600 hover:bg-yellow-700'
      default:
        return 'bg-red-600 hover:bg-red-700'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${getColor()} border rounded-lg shadow-lg p-6 max-w-md w-full mx-4`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getIcon()}</span>
            <h2 className="text-lg font-bold text-gray-900">
              {error.type === 'NO_SUBSCRIPTION' && 'Plano Necessário'}
              {error.type === 'EXPIRED_SUBSCRIPTION' && 'Assinatura Expirada'}
              {error.type === 'INACTIVE_SUBSCRIPTION' && 'Assinatura Inativa'}
              {error.type === 'INVALID_PLAN' && 'Erro de Validação'}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Message */}
        <p className="text-gray-700 mb-6 leading-relaxed">
          {error.userFriendlyMessage}
        </p>

        {/* Details */}
        {error.message && error.message !== error.userFriendlyMessage && (
          <div className="bg-white bg-opacity-50 rounded p-3 mb-6 text-sm text-gray-600">
            <p className="font-mono text-xs">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {showPlansButton && (
            <Link
              href={subscriptionService.getPlansUrl()}
              className={`${getButtonColor()} text-white font-semibold py-2 px-4 rounded transition flex-1 text-center`}
            >
              {error.type === 'EXPIRED_SUBSCRIPTION' ? 'Renovar Plano' : 'Ver Planos'}
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition flex-1"
            >
              Fechar
            </button>
          )}
        </div>

        {/* Support Link */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            Precisa de ajuda?{' '}
            <a href="mailto:suporte@barbabrutal.app" className="text-blue-600 hover:underline">
              Contate o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionErrorModal

