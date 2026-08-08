'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Plus, Repeat, Trash2 } from 'lucide-react'
import Cabecalho from '@/components/shared/Cabecalho'
import Modal from '@/components/painel/Modal'
import useAPI from '@/data/hooks/useAPI'
import { useToast } from '@/hooks/use-toast'

interface Serie {
  id: number
  frequencia: string
  diaSemana: number
  hora: string
  descricao: string
  ativo: boolean
  geradoAte: string | null
  usuario: { id: number; nome: string; telefone: string }
  profissional: { id: number; nome: string }
}

const DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const FREQUENCIAS = [
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'quinzenal', rotulo: 'A cada 15 dias' },
  { valor: 'mensal', rotulo: 'Todo mês' },
]

export default function RecorrentesPage() {
  const { httpGet, httpPost, httpDelete } = useAPI()
  const { success: toastSuccess, error: toastError } = useToast()

  const [series, setSeries] = useState<Serie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const lista = await httpGet('/series')
      setSeries(Array.isArray(lista) ? lista : [])
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos carregar os atendimentos recorrentes.')
    } finally {
      setCarregando(false)
    }
  }, [httpGet, toastError])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function encerrar(serie: Serie) {
    try {
      const resposta = await httpDelete(`/series/${serie.id}`)
      const cancelados = resposta?.horariosCancelados ?? 0
      toastSuccess(
        cancelados > 0
          ? `Recorrência encerrada. ${cancelados} horário(s) futuro(s) foram cancelados.`
          : 'Recorrência encerrada.',
      )
      await carregar()
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos encerrar a recorrência.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-900">
      <Cabecalho
        titulo="Atendimento recorrente"
        descricao="O cliente que volta sempre no mesmo dia e hora, sem precisar remarcar toda vez."
      />

      <div className="container mx-auto max-w-5xl px-4 py-8 md:px-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">
            {series.length} recorrência{series.length === 1 ? '' : 's'}
          </h2>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-zinc-900 hover:bg-yellow-300"
          >
            <Plus size={18} /> Nova recorrência
          </button>
        </div>

        {carregando ? (
          <p className="text-zinc-500">Carregando…</p>
        ) : series.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <Repeat size={40} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="mb-2 text-lg font-semibold text-white">Nenhum cliente fixo ainda</h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-zinc-400">
              &ldquo;Todo sábado às 10h&rdquo;. O sistema cria os próximos horários sozinho,
              e o cliente não precisa lembrar de marcar.
            </p>
            <button
              onClick={() => setModal(true)}
              className="rounded-lg bg-yellow-400 px-5 py-2.5 font-semibold text-zinc-900 hover:bg-yellow-300"
            >
              Criar a primeira
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {series.map((serie) => (
              <div
                key={serie.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="min-w-0">
                  <p className="font-bold text-white">{serie.usuario?.nome}</p>
                  <p className="flex items-center gap-2 text-sm text-zinc-400">
                    <CalendarClock size={14} className="text-yellow-400" />
                    {serie.descricao} · com {serie.profissional?.nome}
                  </p>
                  {serie.geradoAte && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Horários criados até{' '}
                      {new Date(serie.geradoAte).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => encerrar(serie)}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  <Trash2 size={16} /> Encerrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <FormularioDaSerie
          aoFechar={() => setModal(false)}
          aoCriar={async (dados) => {
            try {
              const resultado = await httpPost('/series', dados)
              const criados = resultado?.criados?.length ?? 0
              const pulados = resultado?.pulados?.length ?? 0
              toastSuccess(
                pulados > 0
                  ? `Recorrência criada com ${criados} horário(s). ${pulados} ficaram de fora por conflito — confira a agenda.`
                  : `Recorrência criada com ${criados} horário(s).`,
              )
              setModal(false)
              await carregar()
            } catch (erro: any) {
              toastError(erro?.message ?? 'Não conseguimos criar a recorrência.')
            }
          }}
        />
      )}
    </div>
  )
}

function FormularioDaSerie({
  aoFechar,
  aoCriar,
}: {
  aoFechar: () => void
  aoCriar: (dados: any) => Promise<void>
}) {
  const { httpGet } = useAPI()
  const [clientes, setClientes] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])

  const [usuarioId, setUsuarioId] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [escolhidos, setEscolhidos] = useState<number[]>([])
  const [frequencia, setFrequencia] = useState('semanal')
  const [diaSemana, setDiaSemana] = useState('6')
  const [hora, setHora] = useState('10:00')
  const [salvando, setSalvando] = useState(false)

  const { error: toastError } = useToast()

  useEffect(() => {
    Promise.all([httpGet('/usuarios'), httpGet('/profissionais'), httpGet('/servicos')])
      .then(([c, p, s]) => {
        setClientes(Array.isArray(c) ? c.filter((u: any) => !u.barbeiro) : [])
        setProfissionais(Array.isArray(p) ? p : [])
        setServicos(Array.isArray(s) ? s : [])
      })
      .catch((erro: any) => {
        // Sem isto os campos apareciam vazios e o dono ficava olhando um
        // formulário que não dava para preencher, sem nenhuma explicação.
        toastError(
          erro?.message ?? 'Não conseguimos carregar clientes, profissionais e serviços.',
        )
      })
  }, [httpGet, toastError])

  // Só os serviços que o profissional escolhido realiza. Oferecer o que ele
  // não faz é montar uma recorrência que a API vai recusar toda semana.
  const profissional = profissionais.find((p) => String(p.id) === profissionalId)
  const idsQueEleFaz: number[] = (profissional?.servicos ?? []).map((s: any) => s.id)
  const servicosDisponiveis =
    !profissional || idsQueEleFaz.length === 0
      ? servicos
      : servicos.filter((s) => idsQueEleFaz.includes(s.id))

  const pronto = usuarioId && profissionalId && escolhidos.length > 0

  return (
    <Modal aberto titulo="Nova recorrência" onFechar={aoFechar}>
      <div className="space-y-4">
        <Selecao rotulo="Cliente" valor={usuarioId} aoMudar={setUsuarioId} opcoes={clientes} />
        <Selecao
          rotulo="Profissional"
          valor={profissionalId}
          aoMudar={(v) => {
            setProfissionalId(v)
            setEscolhidos([])
          }}
          opcoes={profissionais}
        />

        <div>
          <span className="mb-2 block text-sm text-zinc-400">Serviços</span>
          <div className="flex flex-wrap gap-2">
            {servicosDisponiveis.map((servico) => {
              const marcado = escolhidos.includes(servico.id)
              return (
                <button
                  key={servico.id}
                  type="button"
                  onClick={() =>
                    setEscolhidos((atual) =>
                      marcado ? atual.filter((id) => id !== servico.id) : [...atual, servico.id],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    marcado
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                      : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {servico.nome}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Com que frequência</span>
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-yellow-400"
            >
              {FREQUENCIAS.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Dia</span>
            <select
              value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-yellow-400"
            >
              {DIAS.map((dia, i) => (
                <option key={dia} value={String(i)}>
                  {dia}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Hora</span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-yellow-400"
            />
          </label>
        </div>

        <p className="text-xs text-zinc-500">
          O sistema já cria os próximos horários. Se algum cair em folga ou feriado, ele é
          pulado e a gente avisa quais foram — a recorrência continua.
        </p>

        <button
          disabled={!pronto || salvando}
          onClick={async () => {
            setSalvando(true)
            await aoCriar({
              usuarioId: Number(usuarioId),
              profissionalId: Number(profissionalId),
              servicoIds: escolhidos,
              frequencia,
              diaSemana: Number(diaSemana),
              hora,
            })
            setSalvando(false)
          }}
          className="w-full rounded-lg bg-yellow-400 py-2.5 font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-60"
        >
          {salvando ? 'Criando…' : 'Criar recorrência'}
        </button>
      </div>
    </Modal>
  )
}

function Selecao({
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  opcoes: { id: number; nome: string }[]
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-400">{rotulo}</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-yellow-400"
      >
        <option value="">Escolha…</option>
        {opcoes.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.nome}
          </option>
        ))}
      </select>
    </label>
  )
}
