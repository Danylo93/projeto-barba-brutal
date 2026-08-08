'use client'

import { useCallback, useEffect, useState } from 'react'
import { Info, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { useToast } from '@/hooks/use-toast'
import { reais } from '@/lib/planos'

/**
 * Chave Pix, sinal e agendamento sem cadastro.
 *
 * As três coisas moram juntas porque respondem a uma pergunta só: como esta
 * barbearia recebe e quem ela deixa marcar.
 */
interface Recebimento {
  chavePix: string | null
  sinalAtivo: boolean
  sinalPercent: number
  sinalMinimo: number
  sinalPrazoMinutos: number
  agendamentoSemConta: boolean
}

/** Corte de R$ 50 — o exemplo que mostra a regra funcionando. */
const CORTE_DE_EXEMPLO = 50

export default function AbaRecebimento() {
  const { httpGet, httpPut } = useAPI()
  const { success: toastSuccess, error: toastError } = useToast()

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [chavePix, setChavePix] = useState('')
  const [sinalAtivo, setSinalAtivo] = useState(false)
  const [sinalPercent, setSinalPercent] = useState('30')
  const [sinalMinimo, setSinalMinimo] = useState('10')
  const [prazo, setPrazo] = useState('30')
  const [semConta, setSemConta] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const dados = await httpGet('/tenants/me')
      const atual: Partial<Recebimento> = dados ?? {}
      setChavePix(atual.chavePix ?? '')
      setSinalAtivo(!!atual.sinalAtivo)
      if (atual.sinalPercent != null) setSinalPercent(String(atual.sinalPercent))
      if (atual.sinalMinimo != null) setSinalMinimo(String(atual.sinalMinimo))
      if (atual.sinalPrazoMinutos != null) setPrazo(String(atual.sinalPrazoMinutos))
      setSemConta(atual.agendamentoSemConta !== false)
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos carregar as configurações.')
    } finally {
      setCarregando(false)
    }
  }, [httpGet, toastError])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar() {
    setSalvando(true)
    try {
      await httpPut('/tenants/me/recebimento', {
        chavePix: chavePix.trim(),
        sinalAtivo,
        sinalPercent: Number(sinalPercent || 0),
        sinalMinimo: Number(sinalMinimo || 0),
        sinalPrazoMinutos: Number(prazo || 30),
        agendamentoSemConta: semConta,
      })
      toastSuccess('Configurações de recebimento salvas.')
    } catch (erro: any) {
      // Todo erro de formulário vira toast — erro só no console é erro
      // invisível.
      toastError(erro?.message ?? 'Não conseguimos salvar.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-yellow-400" size={32} />
      </div>
    )
  }

  const sinalDoExemplo = Math.min(
    Math.max((CORTE_DE_EXEMPLO * Number(sinalPercent || 0)) / 100, Number(sinalMinimo || 0)),
    CORTE_DE_EXEMPLO,
  )

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
          <KeyRound size={18} className="text-yellow-400" /> Chave Pix da barbearia
        </h3>
        <p className="mb-4 text-sm text-zinc-400">
          É para esta chave que o sinal vai. O dinheiro cai direto na sua conta — o
          Barbearia Brutal não fica com nada no caminho e não intermedia o pagamento.
        </p>
        <input
          value={chavePix}
          onChange={(e) => setChavePix(e.target.value)}
          placeholder="CPF, CNPJ, e-mail, +5511988887777 ou chave aleatória"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-yellow-400"
        />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="mb-1 text-lg font-bold text-white">Sinal para garantir o horário</h3>
            <p className="text-sm text-zinc-400">
              Contra o furo: o horário só fica reservado depois do Pix. Quem pagou
              adiantado avisa quando não vai poder ir.
            </p>
          </div>
          <Chave ligado={sinalAtivo} aoMudar={setSinalAtivo} rotulo="Exigir sinal" />
        </div>

        {sinalAtivo && (
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Campo rotulo="% do serviço" valor={sinalPercent} aoMudar={setSinalPercent} sufixo="%" />
              <Campo rotulo="Valor mínimo" valor={sinalMinimo} aoMudar={setSinalMinimo} sufixo="R$" />
              <Campo rotulo="Prazo para pagar" valor={prazo} aoMudar={setPrazo} sufixo="min" />
            </div>

            <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              <Info size={18} className="mt-0.5 shrink-0 text-yellow-400" />
              <div>
                <p>
                  Num corte de {reais(CORTE_DE_EXEMPLO)}, o cliente paga{' '}
                  <strong className="text-white">{reais(sinalDoExemplo)}</strong> de sinal e
                  o horário fica preso por {prazo || 30} minutos.
                </p>
                <p className="mt-1 text-zinc-500">
                  Se o Pix não cair nesse prazo, o horário volta para a agenda sozinho.
                  Você confirma o recebimento na tela de agendamentos.
                </p>
              </div>
            </div>

            {!chavePix.trim() && (
              <p className="text-sm text-red-400">
                Cadastre a chave Pix acima antes de salvar — sem ela não há para onde
                mandar o dinheiro.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-yellow-400" /> Agendamento sem cadastro
            </h3>
            <p className="text-sm text-zinc-400">
              O cliente marca na sua página só com nome e WhatsApp, sem criar senha nem
              baixar nada. É o caminho com menos desistência — cada campo a mais some com
              gente no meio.
            </p>
          </div>
          <Chave ligado={semConta} aoMudar={setSemConta} rotulo="Permitir" />
        </div>
      </section>

      <button
        onClick={salvar}
        disabled={salvando || (sinalAtivo && !chavePix.trim())}
        className="w-full rounded-lg bg-yellow-400 py-3 font-semibold text-zinc-900 transition-colors hover:bg-yellow-300 disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}

function Chave({
  ligado,
  aoMudar,
  rotulo,
}: {
  ligado: boolean
  aoMudar: (v: boolean) => void
  rotulo: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => aoMudar(!ligado)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        ligado ? 'bg-yellow-400' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
          ligado ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  sufixo,
}: {
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  sufixo?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-400">{rotulo}</span>
      <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-yellow-400">
        <input
          type="number"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="w-full bg-transparent px-3 py-2 text-white outline-none"
        />
        {sufixo && <span className="pr-3 text-sm text-zinc-500">{sufixo}</span>}
      </div>
    </label>
  )
}
