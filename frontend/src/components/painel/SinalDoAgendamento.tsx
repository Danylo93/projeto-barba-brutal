'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Copy, XCircle } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { useToast } from '@/hooks/use-toast'
import { reais } from '@/lib/planos'

export interface SinalDoAgendamentoProps {
  agendamentoId: number
  sinalValor?: number | null
  sinalStatus?: string | null
  sinalExpiraEm?: string | null
  sinalPixCopiaECola?: string | null
  /** Dono e barbeiro confirmam; cliente só vê e copia o Pix. */
  podeConfirmar: boolean
  aoAtualizar?: () => void
}

/**
 * O estado do sinal dentro do cartão do agendamento.
 *
 * Não aparece quando o agendamento não pede sinal — que é o caso da maioria
 * das barbearias. Uma tarja "sem sinal" em todo cartão seria ruído em cima
 * de informação que não existe.
 */
export default function SinalDoAgendamento({
  agendamentoId,
  sinalValor,
  sinalStatus,
  sinalExpiraEm,
  sinalPixCopiaECola,
  podeConfirmar,
  aoAtualizar,
}: SinalDoAgendamentoProps) {
  const { httpPost } = useAPI()
  const { success: toastSuccess, error: toastError } = useToast()
  const [enviando, setEnviando] = useState(false)

  if (!sinalValor || !sinalStatus || sinalStatus === 'nao_exigido') return null

  async function registrar(acao: 'confirmar' | 'dispensar') {
    setEnviando(true)
    try {
      await httpPost(`/agendamentos/${agendamentoId}/sinal/${acao}`, {})
      toastSuccess(acao === 'confirmar' ? 'Sinal confirmado.' : 'Sinal dispensado.')
      aoAtualizar?.()
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos registrar o sinal.')
    } finally {
      setEnviando(false)
    }
  }

  if (sinalStatus === 'pago') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
        <CheckCircle2 size={14} /> Sinal de {reais(sinalValor)} pago
      </p>
    )
  }

  if (sinalStatus === 'dispensado') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
        <CheckCircle2 size={14} /> Sinal dispensado pela barbearia
      </p>
    )
  }

  if (sinalStatus === 'expirado') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-red-400">
        <XCircle size={14} /> Sinal de {reais(sinalValor)} não foi pago — horário liberado
      </p>
    )
  }

  // Pendente.
  return (
    <div className="rounded-lg border border-yellow-900/60 bg-yellow-950/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-yellow-300">
        <Clock size={14} /> Aguardando sinal de {reais(sinalValor)}
        {sinalExpiraEm && (
          <span className="font-normal text-yellow-200/70">
            até{' '}
            {new Date(sinalExpiraEm).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </p>

      {sinalPixCopiaECola && (
        <button
          onClick={() => {
            navigator.clipboard
              .writeText(sinalPixCopiaECola)
              .then(() => toastSuccess('Pix copiado. É só colar no app do banco.'))
              .catch(() => toastError('Não conseguimos copiar. Selecione o código na mão.'))
          }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-800 py-2 text-xs text-yellow-200 hover:bg-yellow-900/30"
        >
          <Copy size={14} /> Copiar Pix
        </button>
      )}

      {podeConfirmar && (
        <div className="mt-2 flex gap-2">
          <button
            disabled={enviando}
            onClick={() => registrar('confirmar')}
            className="flex-1 rounded-lg bg-green-500/15 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/25 disabled:opacity-60"
          >
            Recebi o Pix
          </button>
          <button
            disabled={enviando}
            onClick={() => registrar('dispensar')}
            className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
          >
            Dispensar
          </button>
        </div>
      )}
    </div>
  )
}
