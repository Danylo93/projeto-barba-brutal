'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Assinatura {
  id: number
  status: string
  dataInicio: string
  dataFim: string
  renovacaoAutomatica: boolean
  plano: {
    id: number
    nome: string
    preco: number
    descricao: string
  }
}

export default function SubscriptionPage() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar se está logado
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    async function fetchAssinatura() {
      try {
        const response = await fetch('/api/assinaturas/active', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar assinatura')
        }

        const data = await response.json()
        setAssinatura(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAssinatura()
  }, [router])

  const handleCancelarAssinatura = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assinaturas/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura')
      }

      alert('Assinatura cancelada com sucesso!')
      // Recarregar dados
      window.location.reload()
    } catch (err: any) {
      alert('Erro ao cancelar assinatura: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando assinatura...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!assinatura) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Nenhuma Assinatura Ativa</h1>
          <p className="text-gray-600 mb-6">Você não possui uma assinatura ativa no momento.</p>
          <Link
            href="/"
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            Escolher Plano
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa'
      case 'canceled':
        return 'Cancelada'
      case 'past_due':
        return 'Vencida'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Minha Assinatura</h1>
          <p className="text-gray-600">Gerencie sua assinatura e pagamentos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações da Assinatura */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Detalhes da Assinatura</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assinatura.status)}`}>
                  {getStatusText(assinatura.status)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Plano:</span>
                <span className="font-semibold">{assinatura.plano.nome}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Preço:</span>
                <span className="font-semibold">R$ {assinatura.plano.preco.toFixed(2).replace('.', ',')}/mês</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Início:</span>
                <span className="font-semibold">
                  {new Date(assinatura.dataInicio).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Próxima cobrança:</span>
                <span className="font-semibold">
                  {new Date(assinatura.dataFim).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Renovação automática:</span>
                <span className="font-semibold">
                  {assinatura.renovacaoAutomatica ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Ações</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleCancelarAssinatura}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 font-semibold"
              >
                Cancelar Assinatura
              </button>

              <Link
                href="/help"
                className="block w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 font-semibold text-center"
              >
                Precisa de Ajuda?
              </Link>

              <Link
                href="/dashboard"
                className="block w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-semibold text-center"
              >
                Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Informações do Plano */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recursos do Plano</h2>
          <p className="text-gray-600 mb-4">{assinatura.plano.descricao}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Gestão de agendamentos</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Gestão de clientes</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Relatórios e análises</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Suporte técnico</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
