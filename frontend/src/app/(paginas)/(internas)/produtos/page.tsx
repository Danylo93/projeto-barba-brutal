'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Plus,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react'
import Cabecalho from '@/components/shared/Cabecalho'
import Modal from '@/components/painel/Modal'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'
import { useToast } from '@/hooks/use-toast'
import { reais } from '@/lib/planos'

interface Produto {
  id: number
  nome: string
  descricao: string | null
  precoVenda: number
  precoCusto: number
  estoque: number
  estoqueMinimo: number
  ativo: boolean
  estoqueBaixo?: boolean
}

interface Movimento {
  id: number
  tipo: string
  quantidade: number
  saldoDepois: number
  valorUnitario: number | null
  motivo: string | null
  createdAt: string
  produto?: { nome: string }
}

interface Resumo {
  totalDeProdutos: number
  valorDoEstoque: number
  faturamento: number
  lucro: number
  precisaRepor: { id: number; nome: string; estoque: number; estoqueMinimo: number }[]
  maisVendidos: { nome: string; quantidade: number; total: number }[]
}

const ROTULO_DO_MOVIMENTO: Record<string, string> = {
  entrada: 'Entrada',
  venda: 'Venda',
  saida: 'Saída',
  ajuste: 'Ajuste',
}

export default function ProdutosPage() {
  const { httpGet, httpPost } = useAPI()
  const { usuario } = useSessao()
  const { success: toastSuccess, error: toastError } = useToast()

  const ehDono = usuario?.tipo === 'tenant'

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [modalProduto, setModalProduto] = useState(false)
  const [modalMovimento, setModalMovimento] = useState<Produto | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const [lista, historico] = await Promise.all([
        httpGet('/produtos'),
        httpGet('/produtos/movimentos?limite=30'),
      ])
      setProdutos(Array.isArray(lista) ? lista : [])
      setMovimentos(Array.isArray(historico) ? historico : [])

      if (ehDono) {
        const painel = await httpGet('/produtos/resumo')
        setResumo(painel ?? null)
      }
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos carregar os produtos.')
    } finally {
      setCarregando(false)
    }
  }, [httpGet, ehDono, toastError])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvarProduto(dados: any) {
    setSalvando(true)
    try {
      await httpPost('/produtos', dados)
      toastSuccess('Produto cadastrado.')
      setModalProduto(false)
      await carregar()
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos salvar o produto.')
    } finally {
      setSalvando(false)
    }
  }

  async function registrarMovimento(produtoId: number, dados: any) {
    setSalvando(true)
    try {
      await httpPost(`/produtos/${produtoId}/movimentos`, dados)
      toastSuccess('Estoque atualizado.')
      setModalMovimento(null)
      await carregar()
    } catch (erro: any) {
      toastError(erro?.message ?? 'Não conseguimos registrar o movimento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col bg-zinc-900 min-h-screen">
      <Cabecalho
        titulo="Produtos"
        descricao="O que a barbearia revende no balcão, com o estoque batendo."
      />

      <div className="container mx-auto max-w-6xl px-4 py-8 md:px-0">
        {resumo && <PainelDoDono resumo={resumo} />}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">
            {produtos.length} produto{produtos.length === 1 ? '' : 's'}
          </h2>
          {ehDono && (
            <button
              onClick={() => setModalProduto(true)}
              className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-zinc-900 transition-colors hover:bg-yellow-300"
            >
              <Plus size={18} /> Novo produto
            </button>
          )}
        </div>

        {carregando ? (
          <p className="text-zinc-500">Carregando…</p>
        ) : produtos.length === 0 ? (
          <VazioAindaSemProduto podeCadastrar={ehDono} aoCadastrar={() => setModalProduto(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((produto) => (
              <CartaoDoProduto
                key={produto.id}
                produto={produto}
                aoMovimentar={() => setModalMovimento(produto)}
              />
            ))}
          </div>
        )}

        {movimentos.length > 0 && <Historico movimentos={movimentos} />}
      </div>

      {modalProduto && (
        <FormularioDoProduto
          salvando={salvando}
          aoFechar={() => setModalProduto(false)}
          aoSalvar={salvarProduto}
        />
      )}

      {modalMovimento && (
        <FormularioDoMovimento
          produto={modalMovimento}
          salvando={salvando}
          ehDono={ehDono}
          aoFechar={() => setModalMovimento(null)}
          aoSalvar={(dados) => registrarMovimento(modalMovimento.id, dados)}
        />
      )}
    </div>
  )
}

function PainelDoDono({ resumo }: { resumo: Resumo }) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Numero rotulo="Produtos ativos" valor={String(resumo.totalDeProdutos)} />
        <Numero rotulo="Parado em estoque" valor={reais(resumo.valorDoEstoque)} />
        <Numero rotulo="Vendido no mês" valor={reais(resumo.faturamento)} />
        {/* Faturamento não é lucro, e em revenda a diferença é o negócio
            inteiro: pomada de R$ 40 que custou R$ 32 dá R$ 8. */}
        <Numero rotulo="Lucro no mês" valor={reais(resumo.lucro)} destaque />
      </div>

      {resumo.precisaRepor.length > 0 && (
        <div className="mt-4 rounded-xl border border-yellow-900 bg-yellow-950/40 p-4">
          <p className="mb-2 flex items-center gap-2 font-semibold text-yellow-300">
            <AlertTriangle size={18} /> Está acabando
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-yellow-100/80">
            {resumo.precisaRepor.map((p) => (
              <li key={p.id}>
                {p.nome} — restam {p.estoque}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Numero({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold ${destaque ? 'text-green-400' : 'text-white'}`}>
        {valor}
      </p>
    </div>
  )
}

function CartaoDoProduto({
  produto,
  aoMovimentar,
}: {
  produto: Produto
  aoMovimentar: () => void
}) {
  const acabou = produto.estoque <= 0

  return (
    <div
      className={`flex flex-col rounded-xl border-2 bg-zinc-950 p-5 ${
        acabou
          ? 'border-red-900/60'
          : produto.estoqueBaixo
            ? 'border-yellow-700/60'
            : 'border-zinc-800'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-bold text-white">{produto.nome}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            acabou
              ? 'bg-red-500/10 text-red-400'
              : produto.estoqueBaixo
                ? 'bg-yellow-400/10 text-yellow-400'
                : 'bg-green-500/10 text-green-400'
          }`}
        >
          {acabou ? 'Acabou' : `${produto.estoque} em estoque`}
        </span>
      </div>

      {produto.descricao && (
        <p className="mb-3 text-sm text-zinc-400">{produto.descricao}</p>
      )}

      <p className="mb-4 text-2xl font-black text-white">{reais(produto.precoVenda)}</p>

      <button
        onClick={aoMovimentar}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
      >
        <SlidersHorizontal size={16} /> Movimentar estoque
      </button>
    </div>
  )
}

function VazioAindaSemProduto({
  podeCadastrar,
  aoCadastrar,
}: {
  podeCadastrar: boolean
  aoCadastrar: () => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
      <Package size={40} className="mx-auto mb-4 text-zinc-600" />
      <h3 className="mb-2 text-lg font-semibold text-white">Nenhum produto ainda</h3>
      <p className="mx-auto mb-6 max-w-md text-sm text-zinc-400">
        Pomada, óleo, shampoo, minoxidil. Cadastre o que a barbearia revende e o sistema
        passa a contar quanto entra, quanto sai e quanto sobra.
      </p>
      {podeCadastrar && (
        <button
          onClick={aoCadastrar}
          className="rounded-lg bg-yellow-400 px-5 py-2.5 font-semibold text-zinc-900 hover:bg-yellow-300"
        >
          Cadastrar o primeiro
        </button>
      )}
    </div>
  )
}

function Historico({ movimentos }: { movimentos: Movimento[] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-white">Últimos movimentos</h2>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Movimento</th>
              <th className="px-4 py-3 text-right">Qtde</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {movimentos.map((m) => {
              const entrada = m.tipo === 'entrada'
              return (
                <tr key={m.id} className="text-zinc-300">
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(m.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">{m.produto?.nome ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        entrada ? 'text-green-400' : m.tipo === 'ajuste' ? 'text-zinc-400' : 'text-yellow-400'
                      }`}
                    >
                      {entrada ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                      {ROTULO_DO_MOVIMENTO[m.tipo] ?? m.tipo}
                    </span>
                    {m.motivo && <span className="ml-2 text-xs text-zinc-500">{m.motivo}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{m.quantidade}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{m.saldoDepois}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FormularioDoProduto({
  salvando,
  aoFechar,
  aoSalvar,
}: {
  salvando: boolean
  aoFechar: () => void
  aoSalvar: (dados: any) => void
}) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [precoCusto, setPrecoCusto] = useState('')
  const [estoque, setEstoque] = useState('0')
  const [estoqueMinimo, setEstoqueMinimo] = useState('0')

  return (
    <Modal aberto titulo="Novo produto" onFechar={aoFechar}>
      <div className="space-y-4">
        <Campo rotulo="Nome" valor={nome} aoMudar={setNome} placeholder="Pomada modeladora" />
        <Campo
          rotulo="Descrição (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          placeholder="120g, efeito seco"
        />
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="Preço de venda" valor={precoVenda} aoMudar={setPrecoVenda} tipo="number" placeholder="40,00" />
          <Campo rotulo="Preço de custo" valor={precoCusto} aoMudar={setPrecoCusto} tipo="number" placeholder="32,00" />
        </div>
        <p className="-mt-2 text-xs text-zinc-500">
          O custo fica só para você: é ele que transforma faturamento em lucro no relatório.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="Estoque inicial" valor={estoque} aoMudar={setEstoque} tipo="number" />
          <Campo rotulo="Avisar quando restar" valor={estoqueMinimo} aoMudar={setEstoqueMinimo} tipo="number" />
        </div>
        <p className="-mt-2 text-xs text-zinc-500">
          Deixe o aviso em 0 para não ser avisado deste produto.
        </p>

        <button
          disabled={salvando || nome.trim().length < 2 || !precoVenda}
          onClick={() =>
            aoSalvar({
              nome: nome.trim(),
              descricao: descricao.trim() || undefined,
              precoVenda: Number(precoVenda),
              precoCusto: Number(precoCusto || 0),
              estoque: Number(estoque || 0),
              estoqueMinimo: Number(estoqueMinimo || 0),
            })
          }
          className="w-full rounded-lg bg-yellow-400 py-2.5 font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Cadastrar produto'}
        </button>
      </div>
    </Modal>
  )
}

function FormularioDoMovimento({
  produto,
  salvando,
  ehDono,
  aoFechar,
  aoSalvar,
}: {
  produto: Produto
  salvando: boolean
  ehDono: boolean
  aoFechar: () => void
  aoSalvar: (dados: any) => void
}) {
  const [tipo, setTipo] = useState('venda')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('')

  const opcoes = [
    { valor: 'venda', rotulo: 'Venda', icone: <ShoppingCart size={16} /> },
    { valor: 'entrada', rotulo: 'Entrada', icone: <ArrowUpCircle size={16} /> },
    { valor: 'saida', rotulo: 'Perda / uso interno', icone: <ArrowDownCircle size={16} /> },
    // Ajuste é a contagem de prateleira. Só o dono corrige o saldo.
    ...(ehDono ? [{ valor: 'ajuste', rotulo: 'Contagem', icone: <SlidersHorizontal size={16} /> }] : []),
  ]

  const ehAjuste = tipo === 'ajuste'
  const quantidadeNum = Number(quantidade)
  const passaDoSaldo = !ehAjuste && tipo !== 'entrada' && quantidadeNum > produto.estoque

  return (
    <Modal aberto titulo={produto.nome} onFechar={aoFechar}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          Em estoque agora: <span className="font-semibold text-white">{produto.estoque}</span>
        </p>

        <div className="grid grid-cols-2 gap-2">
          {opcoes.map((opcao) => (
            <button
              key={opcao.valor}
              onClick={() => setTipo(opcao.valor)}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm transition-colors ${
                tipo === opcao.valor
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                  : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {opcao.icone} {opcao.rotulo}
            </button>
          ))}
        </div>

        <Campo
          rotulo={ehAjuste ? 'Quantas unidades você contou' : 'Quantidade'}
          valor={quantidade}
          aoMudar={setQuantidade}
          tipo="number"
        />
        {ehAjuste && (
          <p className="-mt-2 text-xs text-zinc-500">
            O saldo passa a ser este número. A diferença fica registrada no histórico.
          </p>
        )}
        {passaDoSaldo && (
          <p className="-mt-2 text-xs text-red-400">
            Não dá para tirar {quantidadeNum} de um estoque de {produto.estoque}.
          </p>
        )}

        <Campo
          rotulo="Motivo (opcional)"
          valor={motivo}
          aoMudar={setMotivo}
          placeholder={ehAjuste ? 'Contagem do mês' : 'Vendido no balcão'}
        />

        <button
          disabled={salvando || !quantidade || passaDoSaldo}
          onClick={() =>
            aoSalvar({
              tipo,
              quantidade: quantidadeNum,
              motivo: motivo.trim() || undefined,
            })
          }
          className="w-full rounded-lg bg-yellow-400 py-2.5 font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-60"
        >
          {salvando ? 'Registrando…' : 'Registrar'}
        </button>
      </div>
    </Modal>
  )
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  placeholder,
}: {
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  tipo?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-400">{rotulo}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-yellow-400"
      />
    </label>
  )
}
