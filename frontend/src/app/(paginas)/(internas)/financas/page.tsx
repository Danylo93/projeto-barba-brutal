'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, Calendar, Scissors } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'
import Cabecalho from '@/components/shared/Cabecalho'
import { Skeleton } from '@/components/ui/skeleton'

interface Servico {
  nome: string
  preco: number
}

interface Agendamento {
  id: number
  data: string
  status?: string
  servicos: Servico[]
}

export default function FinancasPage() {
  const { usuario } = useUsuario()
  const { httpGet } = useAPI()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isTenant = usuario?.tipo === 'tenant'
  const isEmployeeBarber = !!usuario?.barbeiro && !isTenant

  const carregar = useCallback(async () => {
    if (!usuario || !isEmployeeBarber) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const uri = 'agendamentos/barbeiro/meus-horarios'
      const resposta = await httpGet(uri)
      setAgendamentos(Array.isArray(resposta) ? resposta : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar finanças')
      setAgendamentos([])
    } finally {
      setLoading(false)
    }
  }, [httpGet, usuario, isEmployeeBarber])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Calcular ganhos
  const totalArrecadado = agendamentos
    .filter((a) => a.status === 'concluido' || a.status === 'confirmado')
    .reduce((acc, agendamento) => {
      const somaServicos = agendamento.servicos.reduce((soma, serv) => soma + Number(serv.preco || 0), 0)
      return acc + somaServicos
    }, 0)

  const quantidadeCortes = agendamentos
    .filter((a) => a.status === 'concluido' || a.status === 'confirmado')
    .length

  if (!isEmployeeBarber && !loading) {
    return (
      <div className="flex flex-col bg-zinc-900 min-h-screen">
        <Cabecalho titulo="Finanças" descricao="Acesso restrito a profissionais." />
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-zinc-900 min-h-screen">
      <Cabecalho
        titulo="Painel Financeiro"
        descricao="Acompanhe seus rendimentos e resultados."
      />
      <div className="container py-10 px-4 md:px-0 max-w-5xl mx-auto">
        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-32 w-full bg-zinc-800 rounded-xl" />
            <Skeleton className="h-32 w-full bg-zinc-800 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 p-6 rounded-2xl flex items-center gap-6 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl group-hover:bg-yellow-400/20 transition-all"></div>
                <div className="bg-yellow-400/15 p-4 rounded-xl">
                  <DollarSign className="w-10 h-10 text-yellow-400" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm uppercase tracking-wider font-semibold">
                    Total Arrecadado
                  </p>
                  <h2 className="text-4xl font-bold text-white mt-1">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(totalArrecadado)}
                  </h2>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 p-6 rounded-2xl flex items-center gap-6 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl group-hover:bg-blue-400/20 transition-all"></div>
                <div className="bg-blue-400/15 p-4 rounded-xl">
                  <Scissors className="w-10 h-10 text-blue-400" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm uppercase tracking-wider font-semibold">
                    Serviços Prestados
                  </p>
                  <h2 className="text-4xl font-bold text-white mt-1">
                    {quantidadeCortes}
                  </h2>
                </div>
              </div>
            </div>

            {/* Tabela de Extrato */}
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden shadow-xl mt-4">
              <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
                <TrendingUp className="text-yellow-400 w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Extrato de Serviços</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-900/50">
                    <tr className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Serviços</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {agendamentos.map((agendamento) => {
                      const soma = agendamento.servicos.reduce((s, serv) => s + Number(serv.preco || 0), 0)
                      return (
                        <tr key={agendamento.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-zinc-500" />
                              {new Date(agendamento.data).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300">
                            <div className="flex flex-wrap gap-1">
                              {agendamento.servicos.map((s, i) => (
                                <span key={i} className="bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-400">
                                  {s.nome}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                agendamento.status === 'concluido'
                                  ? 'bg-green-500/15 text-green-400'
                                  : agendamento.status === 'confirmado'
                                    ? 'bg-blue-500/15 text-blue-400'
                                    : agendamento.status === 'cancelado'
                                      ? 'bg-red-500/15 text-red-400'
                                      : 'bg-yellow-500/15 text-yellow-400'
                              }`}
                            >
                              {agendamento.status ?? 'agendado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(soma)}
                          </td>
                        </tr>
                      )
                    })}
                    {agendamentos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                          Nenhum serviço realizado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
