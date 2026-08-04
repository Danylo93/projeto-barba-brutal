'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, AlertCircle, Crown, QrCode, Copy, RefreshCw, CreditCard, Headset } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'
import Modal from '@/components/painel/Modal'
import { useToast } from '@/hooks/use-toast'

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

interface PixData {
  pagamentoId: number
  status: string
  valor: number
  plano: string
  qrCode: string | null
  qrCodeBase64: string | null
  /** Vem só na cobrança de domínio: nada é ligado sozinho, o suporte executa. */
  atendimentoManual?: boolean
  resumoDominio?: string
}

type OpcaoDominio = 'proprio' | 'novo'

/**
 * Preços do adicional de domínio.
 *
 * Ficam também no backend (`assinatura/dominio.ts`), que é quem cobra — aqui é
 * só vitrine. Se divergirem, vale o que o backend devolve na cobrança: a tela
 * mostra `pixData.valor`, não estes números.
 */
const OPCOES_DOMINIO: {
  opcao: OpcaoDominio
  titulo: string
  preco: string
  detalhe: string
}[] = [
  {
    opcao: 'proprio',
    titulo: 'Já tenho um domínio',
    preco: 'R$ 29,90',
    detalhe: 'A gente configura e aponta para a sua página.',
  },
  {
    opcao: 'novo',
    titulo: 'Ainda não tenho',
    preco: 'R$ 69,90',
    detalhe: 'A gente registra no seu nome, configura e aponta.',
  },
]

export default function PlanosPage() {
  const { httpGet, httpPost } = useAPI()
  const { usuario } = useUsuario()
  const { success: toastSuccess, error: toastError } = useToast()
  const isTenant = usuario?.tipo === 'tenant'

  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoAtualId, setPlanoAtualId] = useState<number | null>(null)
  const [emTeste, setEmTeste] = useState(false)
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvandoId, setSalvandoId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Pix
  const [pixAberto, setPixAberto] = useState(false)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [pixErro, setPixErro] = useState('')
  const [pixLoading, setPixLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Upsell Domínio
  const [modalDominioAberto, setModalDominioAberto] = useState(false)
  const [acaoPendente, setAcaoPendente] = useState<{tipo: 'testar'|'recorrente'|'pix', plano: Plano} | null>(null)
  
  const tentarAcao = (tipo: 'testar'|'recorrente'|'pix', plano: Plano) => {
    if (plano.nome === 'Profissional' || plano.nome === 'Premium') {
      setAcaoPendente({ tipo, plano })
      setModalDominioAberto(true)
    } else {
      executarAcao(tipo, plano)
    }
  }

  const executarAcao = (tipo: 'testar'|'recorrente'|'pix', plano: Plano) => {
    if (tipo === 'testar') testarPlano(plano)
    else if (tipo === 'recorrente') assinarRecorrente(plano)
    else if (tipo === 'pix') abrirPix(plano)
  }

  const gerarPixDominio = async (opcao: OpcaoDominio) => {
    setModalDominioAberto(false)
    if (!isTenant) return
    setPixAberto(true)
    setPixData(null)
    setPixErro('')
    setPixLoading(true)
    setCopiado(false)
    try {
      const resposta = await httpPost('/assinaturas/me/dominio/pix', { opcao })
      if (resposta?.statusCode >= 400 || resposta?.message) {
        throw new Error(resposta.message || 'Não foi possível gerar o Pix do domínio')
      }
      setPixData(resposta)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao gerar o Pix do domínio'
      setPixErro(mensagem)
      toastError(mensagem)
    } finally {
      setPixLoading(false)
    }
  }

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      const listaPlanos = await httpGet('/planos')
      setPlanos((Array.isArray(listaPlanos) ? listaPlanos : []).filter((p: Plano) => p.ativo))

      if (isTenant) {
        const assinatura = await httpGet('/assinaturas/me')
        if (assinatura?.planoId) setPlanoAtualId(assinatura.planoId)
        setEmTeste(assinatura?.status === 'trialing')
        if (assinatura?.dataFim) {
          const dias = Math.ceil((new Date(assinatura.dataFim).getTime() - Date.now()) / 86400000)
          setDiasRestantes(dias)
        }
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

  // Iniciar teste de 30 dias no plano escolhido
  const testarPlano = async (plano: Plano) => {
    if (!isTenant) return
    try {
      setError('')
      setSucesso('')
      setSalvandoId(plano.id)
      const resposta = await httpPost('/assinaturas/me/change-plan', { planoId: plano.id })
      if (resposta?.statusCode >= 400) throw new Error(resposta.message || 'Erro ao ativar o plano')
      setSucesso(`Teste de 30 dias do plano ${plano.nome} ativado!`)
      toastSuccess('Plano ativado', `Teste de 30 dias do plano ${plano.nome} ativado!`)
      await carregar()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar o plano'
      setError(msg)
      toastError('Erro ao ativar o plano', msg)
    } finally {
      setSalvandoId(null)
    }
  }

  /**
   * Assinatura recorrente: o Mercado Pago mostra a tela onde o barbeiro
   * escolhe cartão ou Pix, e passa a cobrar sozinho todo mês.
   */
  const assinarRecorrente = async (plano: Plano) => {
    if (!isTenant) return
    try {
      setSalvandoId(plano.id)
      const r = await httpPost('/assinaturas/me/recorrente', { planoId: plano.id })
      if (r?.statusCode >= 400 || !r?.initPoint) {
        throw new Error(r?.message || 'Não foi possível abrir o pagamento')
      }
      // Sai do nosso site para o checkout do Mercado Pago.
      window.location.href = r.initPoint
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível abrir o pagamento'
      setError(msg)
      toastError('Erro ao iniciar a assinatura', msg)
      setSalvandoId(null)
    }
  }

  // Gerar cobrança Pix para o plano
  const abrirPix = async (plano: Plano) => {
    if (!isTenant) return
    setPixAberto(true)
    setPixData(null)
    setPixErro('')
    setPixLoading(true)
    setCopiado(false)
    try {
      const resposta = await httpPost('/assinaturas/me/pix', { planoId: plano.id })
      if (resposta?.statusCode >= 400 || resposta?.message) {
        throw new Error(resposta.message || 'Não foi possível gerar o Pix')
      }
      setPixData(resposta)
    } catch (err) {
      setPixErro(err instanceof Error ? err.message : 'Erro ao gerar o Pix')
    } finally {
      setPixLoading(false)
    }
  }

  const verificarPix = async () => {
    if (!pixData) return
    setVerificando(true)
    try {
      const r = await httpGet(`/assinaturas/me/pix/${pixData.pagamentoId}`)
      if (r?.status === 'approved') {
        setPixAberto(false)
        // O adicional de domínio não é assinatura: dizer "sua assinatura está
        // ativa" aqui seria mentir duas vezes — não é assinatura, e não tem
        // nada ativo ainda, porque quem configura é o suporte.
        const mensagem = pixData.atendimentoManual
          ? 'Pagamento confirmado! Nosso suporte vai entrar em contato pelo WhatsApp com os próximos passos do seu domínio.'
          : 'Pagamento confirmado! Sua assinatura está ativa.'
        setSucesso(mensagem)
        toastSuccess('Pagamento confirmado', mensagem)
        await carregar()
      } else {
        setPixErro('Pagamento ainda não confirmado. Assim que o Pix cair, clique novamente.')
      }
    } catch {
      setPixErro('Não foi possível verificar o pagamento.')
    } finally {
      setVerificando(false)
    }
  }

  const copiar = () => {
    if (pixData?.qrCode) {
      navigator.clipboard?.writeText(pixData.qrCode)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p className="text-zinc-400 mt-4">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Planos</h1>
          <p className="text-zinc-400 mt-2">
            {isTenant
              ? 'Teste 30 dias grátis e pague com Pix quando quiser'
              : 'Somente a conta da barbearia pode alterar o plano'}
          </p>
          {isTenant && emTeste && diasRestantes !== null && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-yellow-400/10 text-yellow-400 text-sm font-medium">
              <Crown size={16} /> Em teste grátis · {diasRestantes} dia(s) restante(s)
            </div>
          )}

          {/* Mensal x anual. O anual entra quando o pagamento com cartão existir —
              mostrar agora, desabilitado, evita a pergunta "só tem mensal?". */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            <span className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-zinc-900">
              Mensal
            </span>
            <span
              className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium text-zinc-500"
              title="Disponível quando o pagamento com cartão entrar"
            >
              Anual
              <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                em breve
              </span>
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        {sucesso && (
          <div className="bg-green-950/40 border border-green-900 text-green-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle size={20} /> {sucesso}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
          {planos.map((plano) => {
            const atual = plano.id === planoAtualId
            const ilimitado = plano.maxUsuarios >= 999999
            return (
              <div
                key={plano.id}
                className={`bg-zinc-900 rounded-xl flex flex-col p-6 border-2 ${
                  atual ? 'border-yellow-400' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-white">{plano.nome}</h2>
                  {atual && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                      <Crown size={14} /> {emTeste ? 'Em teste' : 'Plano atual'}
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-sm mb-4">{plano.descricao}</p>
                <p className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1">
                  R$ {plano.preco.toFixed(2).replace('.', ',')}
                  <span className="text-sm font-normal text-zinc-500">/mês</span>
                </p>
                <p className="text-xs text-green-400 mb-4">30 dias grátis</p>
                <ul className="space-y-2 my-4 flex-1">
                  <li className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    {ilimitado ? 'Barbeiros ilimitados' : `${plano.maxUsuarios} barbeiro(s)`}
                  </li>
                  {plano.features
                    .filter((f) => !/barbeiro/i.test(f))
                    .map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                        <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                </ul>

                {isTenant && (
                  <div className="flex flex-col gap-2">
                    {atual ? (
                      emTeste ? (
                        <>
                          <button
                            onClick={() => tentarAcao('recorrente', plano)}
                            disabled={salvandoId !== null}
                            className="w-full py-2.5 rounded-lg bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-300 disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            <CreditCard size={18} />
                            {salvandoId === plano.id ? 'Abrindo...' : 'Assinar com cartão ou Pix'}
                          </button>
                          <button
                            onClick={() => tentarAcao('pix', plano)}
                            className="w-full py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <QrCode size={16} /> Pagar um mês por Pix
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-lg bg-zinc-800 text-zinc-500 cursor-default"
                        >
                          Plano atual
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          onClick={() => tentarAcao('testar', plano)}
                          disabled={salvandoId !== null}
                          className="w-full py-2.5 rounded-lg bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
                        >
                          {salvandoId === plano.id ? 'Ativando...' : 'Testar 30 dias grátis'}
                        </button>
                        <button
                          onClick={() => {
                            setAcaoPendente({ tipo: 'recorrente', plano })
                            setModalDominioAberto(true)
                          }}
                          disabled={salvandoId !== null}
                          className="w-full py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <CreditCard size={16} /> Assinar com cartão ou Pix
                        </button>
                        <button
                          onClick={() => abrirPix(plano)}
                          className="w-full py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-xs"
                        >
                          <QrCode size={14} /> Pagar um mês por Pix
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Modal aberto={pixAberto} titulo="Pagamento via Pix" onFechar={() => setPixAberto(false)}>
        {pixLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
            <p className="text-zinc-400 mt-3 text-sm">Gerando cobrança Pix...</p>
          </div>
        )}

        {!pixLoading && pixErro && !pixData && (
          <div className="text-center py-4">
            <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
            <p className="text-red-300 text-sm">{pixErro}</p>
            <p className="text-zinc-500 text-xs mt-3">
              O administrador do sistema pode confirmar o pagamento manualmente pelo painel.
            </p>
          </div>
        )}

        {!pixLoading && pixData && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-zinc-400 text-sm">
                {pixData.plano} · <span className="text-white font-semibold">R$ {pixData.valor.toFixed(2).replace('.', ',')}</span>
              </p>
              {pixData.resumoDominio && (
                <p className="text-zinc-500 text-xs mt-1">{pixData.resumoDominio}</p>
              )}
            </div>

            {/* Repetido aqui de propósito: é a última tela antes de o dinheiro
                sair, e é onde a promessa precisa estar clara. */}
            {pixData.atendimentoManual && (
              <div className="flex gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-3">
                <Headset size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-zinc-300 text-xs leading-relaxed">
                  Assim que o pagamento cair,{' '}
                  <strong>alguém do nosso suporte entra em contato pelo WhatsApp</strong> com os
                  próximos passos. O domínio não é ativado automaticamente — a configuração é
                  feita junto com você.
                </p>
              </div>
            )}
            {pixData.qrCodeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code Pix"
                className="w-52 h-52 mx-auto rounded-lg bg-white p-2"
              />
            ) : (
              <div className="w-52 h-52 mx-auto rounded-lg bg-zinc-800 flex items-center justify-center">
                <QrCode size={64} className="text-zinc-600" />
              </div>
            )}
            {pixData.qrCode && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Pix copia e cola</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pixData.qrCode}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs truncate"
                  />
                  <button
                    onClick={copiar}
                    className="px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-yellow-400"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                {copiado && <p className="text-xs text-green-400 mt-1">Copiado!</p>}
              </div>
            )}
            {pixErro && <p className="text-yellow-400 text-xs text-center">{pixErro}</p>}
            <button
              onClick={verificarPix}
              disabled={verificando}
              className="w-full py-2.5 rounded-lg bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-300 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={verificando ? 'animate-spin' : ''} />
              {verificando ? 'Verificando...' : 'Já paguei — verificar'}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal de Upsell do Domínio Próprio */}
      <Modal
        aberto={modalDominioAberto}
        onFechar={() => setModalDominioAberto(false)}
        titulo="Dê um toque profissional à sua Barbearia!"
      >
        <div className="p-2 sm:p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-400/10 text-yellow-400 rounded-full flex items-center justify-center mb-4">
              <Crown size={32} />
            </div>
            <p className="text-zinc-400 text-sm">
              Que tal um link como <strong className="text-white">suabarbearia.com.br</strong> no
              lugar do padrão? Taxa única, sem mensalidade.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {OPCOES_DOMINIO.map((op) => (
              <button
                key={op.opcao}
                onClick={() => gerarPixDominio(op.opcao)}
                className="w-full text-left p-4 rounded-xl border border-zinc-700 hover:border-yellow-400 hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-white">{op.titulo}</span>
                  <span className="text-yellow-400 font-bold whitespace-nowrap">{op.preco}</span>
                </div>
                <p className="text-zinc-400 text-xs mt-1">{op.detalhe}</p>
              </button>
            ))}
          </div>

          {/* Dito ANTES de pagar, não depois. A oferta antiga sumia no
              pagamento: o dono pagava, nada mudava na conta dele, e a única
              saída era pedir estorno. */}
          <div className="mt-4 flex gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 p-3">
            <Headset size={16} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-zinc-400 text-xs leading-relaxed">
              Domínio não liga sozinho. Depois do pagamento,{' '}
              <strong className="text-zinc-200">alguém do nosso suporte entra em contato</strong>{' '}
              pelo WhatsApp com os próximos passos e cuida da configuração com você.
            </p>
          </div>

          <button
            onClick={() => {
              setModalDominioAberto(false)
              if (acaoPendente) executarAcao(acaoPendente.tipo, acaoPendente.plano)
            }}
            className="w-full mt-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors font-medium"
          >
            Agora não, quero apenas assinar o plano
          </button>
        </div>
      </Modal>
    </div>
  )
}
