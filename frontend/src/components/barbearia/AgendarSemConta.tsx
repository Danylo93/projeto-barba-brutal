'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, CheckCircle2, Copy, Loader2 } from 'lucide-react'
import {
  brl,
  duracao,
  hojeEmBrasilia,
  instanteBrasilia,
  mascaraTelefone,
  montarHorarios,
} from '@/lib/horarios-publicos'
import type { DiaHorario } from '@/lib/agendamento-utils'

/**
 * Agendar sem criar conta.
 *
 * A promessa é essa e nada além: nome, WhatsApp e pronto. Cada campo a mais
 * some com gente no meio do caminho, e quem estava só tentando marcar um
 * corte desiste na tela de senha.
 *
 * O componente é do cliente porque a escolha de horário depende do que já
 * está ocupado, e isso muda a cada minuto — cachear seria oferecer horário
 * que já foi.
 */

interface Servico {
  id: number
  nome: string
  preco: number
  qtdeSlots: number
  ehCombo?: boolean
}

interface Profissional {
  id: number
  nome: string
  servicos?: { id: number }[]
}

interface Sinal {
  ativo: boolean
  percent?: number
  minimo?: number
  prazoMinutos?: number
}

export interface AgendarSemContaProps {
  dominio: string
  apiBase: string
  servicos: Servico[]
  profissionais: Profissional[]
  /** Horário de funcionamento por dia da semana (0-6). */
  grade: DiaHorario[]
  sinal?: Sinal
  /** Endereço do login, para quem prefere entrar na conta. */
  hrefLogin: string
}

const MINUTOS_POR_SLOT = 30

export default function AgendarSemConta({
  dominio,
  apiBase,
  servicos,
  profissionais,
  grade,
  sinal,
  hrefLogin,
}: AgendarSemContaProps) {
  const [servicoIds, setServicoIds] = useState<number[]>([])
  const [profissionalId, setProfissionalId] = useState<number | null>(null)
  const [dia, setDia] = useState('')
  const [hora, setHora] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [aceitou, setAceitou] = useState(false)
  const [aceitouLembretes, setAceitouLembretes] = useState(true)

  const [ocupados, setOcupados] = useState<string[]>([])
  const [buscandoHorarios, setBuscandoHorarios] = useState(false)
  const [falhouAoBuscar, setFalhouAoBuscar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [recibo, setRecibo] = useState<any>(null)

  /** Quem atende os serviços escolhidos. Profissional sem vínculo atende tudo. */
  const profissionaisPossiveis = useMemo(() => {
    if (servicoIds.length === 0) return profissionais
    return profissionais.filter((p) => {
      const faz = (p.servicos ?? []).map((s) => s.id)
      return faz.length === 0 || servicoIds.every((id) => faz.includes(id))
    })
  }, [profissionais, servicoIds])

  const escolhidos = servicos.filter((s) => servicoIds.includes(s.id))
  const total = escolhidos.reduce((soma, s) => soma + (s.preco ?? 0), 0)
  const slots = escolhidos.reduce((soma, s) => soma + (s.qtdeSlots ?? 1), 0) || 1

  const sinalEstimado = useMemo(() => {
    if (!sinal?.ativo || total <= 0) return 0
    const doPercentual = (total * (sinal.percent ?? 0)) / 100
    return Math.min(Math.max(doPercentual, sinal.minimo ?? 0), total)
  }, [sinal, total])

  // Buscar os horários ocupados sempre que profissional ou dia mudarem.
  useEffect(() => {
    if (!profissionalId || !dia) {
      setOcupados([])
      return
    }
    let vivo = true
    setBuscandoHorarios(true)
    setFalhouAoBuscar(false)
    fetch(`${apiBase}/publico/${dominio}/horarios/${profissionalId}/${dia}`)
      .then(async (r) => {
        // Falha NÃO pode virar "está tudo livre".
        //
        // Era `r.ok ? r.json() : { ocupados: [] }`: qualquer erro — inclusive
        // o 429 do limite de requisições — fazia a tela oferecer a agenda
        // inteira. A pessoa escolhia um horário ocupado e só descobria ao
        // confirmar, levando "este profissional já tem um atendimento às
        // 14:00" na cara.
        if (!r.ok) throw new Error('não deu para consultar')
        return r.json()
      })
      .then((dados) => {
        if (vivo) setOcupados(Array.isArray(dados?.ocupados) ? dados.ocupados : [])
      })
      .catch(() => {
        if (vivo) setFalhouAoBuscar(true)
      })
      .finally(() => {
        if (vivo) setBuscandoHorarios(false)
      })
    return () => {
      vivo = false
    }
  }, [apiBase, dominio, profissionalId, dia])

  const horariosDoDia = useMemo(
    () => (falhouAoBuscar ? [] : montarHorarios(grade, dia, slots, ocupados)),
    [grade, dia, slots, ocupados, falhouAoBuscar],
  )

  const alternarServico = useCallback(
    (servico: Servico) => {
      setHora('')
      setServicoIds((atual) => {
        if (atual.includes(servico.id)) return atual.filter((id) => id !== servico.id)
        // Combo é exclusivo: ele já é o pacote fechado.
        if (servico.ehCombo) return [servico.id]
        const semCombo = atual.filter((id) => !servicos.find((s) => s.id === id)?.ehCombo)
        return [...semCombo, servico.id]
      })
    },
    [servicos],
  )

  async function enviar() {
    setErro('')
    setEnviando(true)
    try {
      const resposta = await fetch(`${apiBase}/publico/${dominio}/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone,
          profissionalId,
          servicos: servicoIds,
          data: instanteBrasilia(dia, hora),
          aceitouTermos: aceitou,
          aceitouLembretes,
        }),
      })

      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) {
        throw new Error(dados?.message ?? 'Não conseguimos marcar. Tente outro horário.')
      }
      setRecibo(dados)
    } catch (e: any) {
      setErro(e?.message ?? 'Não conseguimos marcar agora.')
    } finally {
      setEnviando(false)
    }
  }

  if (recibo) return <Confirmado recibo={recibo} />

  const pronto =
    servicoIds.length > 0 &&
    profissionalId &&
    dia &&
    hora &&
    nome.trim().length >= 2 &&
    telefone.replace(/\D/g, '').length >= 10 &&
    aceitou

  return (
    <section id="agendar" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-3xl font-black text-white">Marque seu horário</h2>
          <p className="text-zinc-400">
            Sem criar conta, sem senha, sem baixar nada. Nome e WhatsApp e pronto.
          </p>
        </div>

        <div className="space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8">
          <Passo numero={1} titulo="O que você quer fazer">
            <div className="flex flex-wrap gap-2">
              {servicos.map((servico) => {
                const marcado = servicoIds.includes(servico.id)
                return (
                  <button
                    key={servico.id}
                    type="button"
                    onClick={() => alternarServico(servico)}
                    className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
                      marcado
                        ? 'border-tenant-secondary bg-tenant-secondary/10 text-white'
                        : 'border-zinc-700 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{servico.nome}</span>
                    <span className="block text-xs text-zinc-500">
                      {brl(servico.preco)} · {duracao(servico.qtdeSlots)}
                    </span>
                  </button>
                )
              })}
            </div>
          </Passo>

          <Passo numero={2} titulo="Com quem">
            <div className="flex flex-wrap gap-2">
              {profissionaisPossiveis.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProfissionalId(p.id)
                    setHora('')
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    profissionalId === p.id
                      ? 'border-tenant-secondary bg-tenant-secondary/10 text-white'
                      : 'border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {p.nome}
                </button>
              ))}
            </div>
            {servicoIds.length > 0 && profissionaisPossiveis.length === 0 && (
              <p className="text-sm text-yellow-400">
                Nenhum profissional faz todos esses serviços juntos. Tente marcar em
                separado.
              </p>
            )}
          </Passo>

          <Passo numero={3} titulo="Quando">
            <input
              type="date"
              value={dia}
              min={hojeEmBrasilia()}
              onChange={(e) => {
                setDia(e.target.value)
                setHora('')
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-tenant-secondary sm:w-auto"
            />

            {dia && (
              <div className="mt-4">
                {buscandoHorarios ? (
                  <p className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 size={16} className="animate-spin" /> Vendo o que está livre…
                  </p>
                ) : falhouAoBuscar ? (
                  <p className="text-sm text-yellow-400">
                    Não conseguimos ver a agenda agora. Escolha o dia de novo em alguns
                    instantes — não queremos oferecer um horário que já foi.
                  </p>
                ) : horariosDoDia.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    Sem horário livre neste dia. Tente outro.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {horariosDoDia.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHora(h)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          hora === h
                            ? 'border-tenant-secondary bg-tenant-secondary/10 text-white'
                            : 'border-zinc-700 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Passo>

          <Passo numero={4} titulo="Quem é você">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-tenant-secondary"
              />
              <input
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                placeholder="(11) 98888-7777"
                inputMode="tel"
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-tenant-secondary"
              />
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={aceitou}
                onChange={(e) => setAceitou(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-yellow-400"
              />
              <span>
                Li e aceito os{' '}
                <Link href="/terms" className="text-tenant-secondary underline">
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link href="/privacy" className="text-tenant-secondary underline">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            <label className="mt-2 flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={aceitouLembretes}
                onChange={(e) => setAceitouLembretes(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-yellow-400"
              />
              <span>Quero receber a confirmação e o lembrete no WhatsApp.</span>
            </label>
          </Passo>

          {total > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
              <div className="flex justify-between text-zinc-300">
                <span>Total</span>
                <span className="font-bold text-white">{brl(total)}</span>
              </div>
              {sinalEstimado > 0 && (
                <p className="mt-2 text-xs text-yellow-300">
                  Para garantir o horário, a barbearia pede um sinal de{' '}
                  <strong>{brl(sinalEstimado)}</strong> por Pix. O código aparece assim que
                  você confirmar, e o horário fica reservado por{' '}
                  {sinal?.prazoMinutos ?? 30} minutos.
                </p>
              )}
            </div>
          )}

          {erro && (
            <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            disabled={!pronto || enviando}
            onClick={enviar}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-tenant-secondary py-4 font-bold text-tenant-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Marcando…
              </>
            ) : (
              <>
                <CalendarCheck size={18} /> Confirmar horário
              </>
            )}
          </button>

          <p className="text-center text-xs text-zinc-500">
            Já tem conta aqui?{' '}
            <Link href={hrefLogin} className="text-tenant-secondary underline">
              Entrar
            </Link>{' '}
            para ver seu histórico.
          </p>
        </div>
      </div>
    </section>
  )
}

function Confirmado({ recibo }: { recibo: any }) {
  const [copiado, setCopiado] = useState(false)
  const quando = new Date(recibo.data)

  return (
    <section id="agendar" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-green-900/60 bg-green-950/20 p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400" />
        <h2 className="mb-2 text-2xl font-black text-white">Horário marcado</h2>
        <p className="mb-6 text-zinc-300">
          {quando.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}{' '}
          às{' '}
          {quando.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          })}
          {recibo.profissional && <> com {recibo.profissional}</>}
        </p>

        {recibo.sinal ? (
          <div className="rounded-xl border border-yellow-900/60 bg-yellow-950/30 p-4 text-left">
            <p className="mb-3 text-sm text-yellow-200">
              Falta o sinal de <strong>{brl(recibo.sinal.valor)}</strong> para o horário ficar
              reservado. Copie o Pix e pague no app do seu banco.
            </p>
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(recibo.sinal.pixCopiaECola)
                  .then(() => setCopiado(true))
                  .catch(() => undefined)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 py-3 font-bold text-zinc-900"
            >
              <Copy size={16} /> {copiado ? 'Pix copiado!' : 'Copiar código Pix'}
            </button>
            {recibo.sinal.expiraEm && (
              <p className="mt-2 text-center text-xs text-yellow-200/70">
                O horário fica seu até{' '}
                {/* No fuso de Brasília, igual à data do agendamento logo
                    acima. Sem fixar, um cliente viajando leria o prazo no
                    fuso dele e acharia que já venceu. */}
                {new Date(recibo.sinal.expiraEm).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo',
                })}
                .
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            Você vai receber a confirmação no WhatsApp. Até lá!
          </p>
        )}
      </div>
    </section>
  )
}

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: number
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-bold text-white">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tenant-secondary text-xs text-tenant-primary">
          {numero}
        </span>
        {titulo}
      </h3>
      {children}
    </div>
  )
}
