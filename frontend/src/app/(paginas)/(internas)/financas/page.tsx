'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, TrendingUp, Calendar, Scissors } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'
import Cabecalho from '@/components/shared/Cabecalho'
import { Skeleton } from '@/components/ui/skeleton'
import RelatorioComissoes from '@/components/painel/RelatorioComissoes'
import GestaoBloqueios from '@/components/painel/GestaoBloqueios'
import UpgradeCallout from '@/components/painel/UpgradeCallout'
import usePlanoAssinatura from '@/hooks/usePlanoAssinatura'

interface Servico {
  nome: string
  preco: number
}

interface Agendamento {
  id: number
  data: string
  status?: string
  servicos: Servico[]
  /** Valor congelado no ato do agendamento — é o que foi realmente combinado. */
  valorTotal?: number
}

/**
 * Prefere o valor congelado. Só soma os serviços em agendamento antigo,
 * anterior ao congelamento; senão um reajuste de preço mexeria no que o
 * barbeiro já recebeu.
 */
function valorDoAgendamento(agendamento: Agendamento): number {
  if (typeof agendamento.valorTotal === 'number') return agendamento.valorTotal
  return (agendamento.servicos ?? []).reduce((soma, serv) => soma + Number(serv.preco || 0), 0)
}

export default function FinancasPage() {
  const router = useRouter()
  const { usuario } = useUsuario()
  const { httpGet } = useAPI()
  const plano = usePlanoAssinatura()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [abaAtual, setAbaAtual] = useState<'basico' | 'comissoes' | 'avancado'>('basico')

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
      if (isTenant && usuario.tenantId && (plano.isProfissional || plano.isPremium)) {
        setAbaAtual('comissoes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar finanças')
      setAgendamentos([])
    } finally {
      setLoading(false)
    }
  }, [httpGet, usuario, isEmployeeBarber, isTenant, plano.isPremium, plano.isProfissional])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Calcular ganhos
  const totalArrecadado = agendamentos
    .filter((a) => a.status === 'concluido' || a.status === 'confirmado')
    .reduce((acc, agendamento) => acc + valorDoAgendamento(agendamento), 0)

  const quantidadeCortes = agendamentos
    .filter((a) => a.status === 'concluido' || a.status === 'confirmado')
    .length

  // Dono da barbearia: vê relatórios baseados no plano
  if (isTenant) {
    const isBasico = plano.isBasico
    const isProfissional = plano.isProfissional
    const isPremium = plano.isPremium

    return (
      <div className="flex flex-col bg-zinc-900 min-h-screen">
        <Cabecalho
          titulo="Financeiro"
          descricao={`Faturamento, relatórios e comissões. (Plano ${plano.nome})`}
        />
        <div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-0">
          {isBasico && (
            <UpgradeCallout
              descricao="Seu plano atual é Básico. Para liberar relatórios de comissão e visão avançada, faça upgrade para o Profissional. Se quiser tudo liberado, o Premium destrava os relatórios completos."
              ctaPrincipal="Ver planos"
              ctaSecundario="Gerenciar assinatura"
            />
          )}

          {/* Navegação de Abas Baseada no Plano */}
          <div className="flex border-b border-zinc-800 mb-6">
            <button
              onClick={() => setAbaAtual('basico')}
              className={`px-4 py-3 font-semibold text-sm transition-colors ${abaAtual === 'basico' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Dashboard Básico
            </button>
            <button
              onClick={() => isProfissional ? setAbaAtual('comissoes') : router.push('/planos')}
              disabled={!isProfissional}
              className={`px-4 py-3 font-semibold text-sm transition-colors ${abaAtual === 'comissoes' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500'} ${!isProfissional ? 'opacity-50 cursor-not-allowed' : 'hover:text-zinc-300'}`}
              title={!isProfissional ? 'Exclusivo para planos Profissional e Premium' : ''}
            >
              Comissões da Equipe {!isProfissional && '🔒'}
            </button>
            <button
              onClick={() => isPremium ? setAbaAtual('avancado') : router.push('/planos')}
              disabled={!isPremium}
              className={`px-4 py-3 font-semibold text-sm transition-colors ${abaAtual === 'avancado' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500'} ${!isPremium ? 'opacity-50 cursor-not-allowed' : 'hover:text-zinc-300'}`}
              title={!isPremium ? 'Exclusivo para plano Premium' : ''}
            >
              Relatório Completo {!isPremium && '🔒'}
            </button>
          </div>

          {abaAtual === 'basico' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <TrendingUp size={48} className="text-zinc-700 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Visão Geral de Agendamentos</h3>
              <p className="text-zinc-400 max-w-md">
                No plano básico você pode acompanhar no dashboard inicial a quantidade de agendamentos realizados.
                Para análises de comissão, faça upgrade para o Profissional.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push('/planos')}
                  className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-300 transition-colors"
                >
                  Fazer upgrade
                </button>
                <button
                  onClick={() => router.push('/assinatura')}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Ver minha assinatura
                </button>
              </div>
            </div>
          )}

          {abaAtual === 'comissoes' && isProfissional && (
            <RelatorioComissoes />
          )}

          {abaAtual === 'avancado' && isPremium && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 to-yellow-400"></div>
              <DollarSign size={48} className="text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Relatórios Avançados (Premium)</h3>
              <p className="text-zinc-400 max-w-lg mb-6">
                Aqui você visualiza métricas de Ticket Médio, Receita Diária, Fluxo de Caixa e Projeção de Crescimento da Barbearia.
              </p>
              <div className="flex gap-4">
                <button className="px-6 py-2 bg-yellow-400 text-zinc-950 font-bold rounded-lg hover:bg-yellow-300 transition-colors">
                  Exportar PDF
                </button>
                <button className="px-6 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors">
                  Exportar Excel
                </button>
              </div>
            </div>
          )}

          {abaAtual === 'comissoes' && !isProfissional && (
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-6 text-center">
              <h3 className="text-lg font-bold text-white">Relatório de comissão indisponível no Básico</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Faça upgrade para o plano Profissional para liberar essa área e acompanhar comissões da equipe.
              </p>
              <button
                onClick={() => router.push('/planos')}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-300 transition-colors"
              >
                Fazer upgrade
              </button>
            </div>
          )}

          {abaAtual === 'avancado' && !isPremium && (
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-6 text-center">
              <h3 className="text-lg font-bold text-white">Relatório completo disponível no Premium</h3>
              <p className="mt-2 text-sm text-zinc-400">
                O plano Premium libera os relatórios avançados da barbearia.
              </p>
              <button
                onClick={() => router.push('/planos')}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-300 transition-colors"
              >
                Fazer upgrade
              </button>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-10 mt-6">
            <GestaoBloqueios ehDono />
          </div>
        </div>
      </div>
    )
  }

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
                      const soma = valorDoAgendamento(agendamento)
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
