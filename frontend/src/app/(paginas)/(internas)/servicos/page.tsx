'use client'

import { useState, useEffect } from 'react'
import { Scissors, Plus, Trash2, Edit2, Clock, DollarSign } from 'lucide-react'
import Image from 'next/image'
import useAPI from '@/data/hooks/useAPI'
import Modal, { inputModalClasses } from '@/components/painel/Modal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useToast } from '@/hooks/use-toast'

interface Servico {
  id: number
  nome: string
  descricao: string
  preco: number
  qtdeSlots: number
  imagemURL?: string
  ativo: boolean
  createdAt: string
}

const MIN_POR_SLOT = 30
const formVazio = { nome: '', descricao: '', preco: '', duracao: '30', imagemURL: '' }

export default function ServicosPage() {
  const { httpGet, httpPost, httpPut, httpDelete } = useAPI()
  const { success, error: toastError } = useToast()
  
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState<number | null>(null)
  
  const [editando, setEditando] = useState<Servico | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetchServicos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchServicos = async () => {
    try {
      setLoading(true)
      const data = await httpGet('servicos')
      setServicos(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const abrirNovo = () => {
    setEditando(null)
    setForm(formVazio)
    setError('')
    setModalAberto(true)
  }

  const abrirEdicao = (s: Servico) => {
    setEditando(s)
    setForm({
      nome: s.nome,
      descricao: s.descricao,
      preco: String(s.preco),
      duracao: String((s.qtdeSlots ?? 1) * MIN_POR_SLOT),
      imagemURL: s.imagemURL || '',
    })
    setError('')
    setModalAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setError('')
    try {
      const minutos = parseInt(form.duracao, 10) || MIN_POR_SLOT
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        preco: parseFloat(form.preco.replace(',', '.')) || 0,
        qtdeSlots: Math.max(1, Math.ceil(minutos / MIN_POR_SLOT)),
        imagemURL: form.imagemURL,
      }
      const resposta = editando
        ? await httpPut(`servicos/${editando.id}`, payload)
        : await httpPost('servicos', payload)
      if (resposta?.statusCode >= 400 || resposta?.message) {
        throw new Error(resposta.message || 'Não foi possível salvar')
      }
      setModalAberto(false)
      await fetchServicos()
      success('Serviço salvo', 'O serviço foi salvo com sucesso.')
    } catch (err) {
      toastError('Erro ao salvar', err instanceof Error ? err.message : 'Erro ao salvar o serviço')
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async () => {
    if (confirmarExclusao === null) return
    const id = confirmarExclusao
    try {
      await httpDelete(`servicos/${id}`)
      setServicos(servicos.filter((s) => s.id !== id))
      success('Serviço excluído', 'O serviço foi deletado com sucesso.')
    } catch (err) {
      toastError('Erro ao excluir', err instanceof Error ? err.message : 'Erro ao deletar o serviço')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setConfirmarExclusao(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Serviços</h1>
            <p className="text-zinc-400 mt-2">Gerencie todos os serviços oferecidos pela sua barbearia</p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Novo Serviço
          </button>
        </div>

        {error && !modalAberto && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <p className="text-zinc-400 mt-4">Carregando serviços...</p>
          </div>
        )}

        {!loading && servicos.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800 animate-fade-in">
            <Scissors size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-zinc-400 mb-6">Comece adicionando seu primeiro serviço</p>
            <button
              onClick={abrirNovo}
              className="inline-block bg-yellow-400 text-zinc-900 font-semibold px-6 py-2 rounded-lg hover:bg-yellow-300 active:scale-[0.98] transition-all"
            >
              Adicionar Serviço
            </button>
          </div>
        )}

        {!loading && servicos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {servicos.map((servico) => (
              <div
                key={servico.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors overflow-hidden"
              >
                <div className="relative h-40 bg-zinc-800">
                  {servico.imagemURL ? (
                    <Image src={servico.imagemURL} alt={servico.nome} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <Scissors size={48} className="text-zinc-600" />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-white">{servico.nome}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        servico.ativo
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {servico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{servico.descricao}</p>

                  <div className="space-y-2 mb-4 pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <DollarSign size={18} className="text-green-400" />
                      <span className="font-semibold">R$ {servico.preco.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Clock size={18} className="text-yellow-400" />
                      <span>{(servico.qtdeSlots ?? 1) * MIN_POR_SLOT} minutos</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirEdicao(servico)}
                      className="flex-1 flex items-center justify-center gap-2 text-zinc-300 hover:text-yellow-400 py-2 transition-colors"
                    >
                      <Edit2 size={18} />
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmarExclusao(servico.id)}
                      className="flex-1 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-2 transition-colors"
                    >
                      <Trash2 size={18} />
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        aberto={confirmarExclusao !== null}
        titulo="Deletar Serviço"
        mensagem="Tem certeza que deseja excluir este serviço? Esta ação não poderá ser desfeita."
        textoConfirmar="Deletar"
        onConfirmar={handleDelete}
        onCancelar={() => setConfirmarExclusao(null)}
      />

      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar Serviço' : 'Novo Serviço'}
        onFechar={() => setModalAberto(false)}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Nome</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Corte de Cabelo"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Descrição</label>
            <textarea
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              placeholder="Descrição do serviço"
              className={inputModalClasses}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Preço (R$)</label>
              <input
                required
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="25,00"
                className={inputModalClasses}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Duração (min)</label>
              <input
                required
                type="number"
                min={30}
                step={30}
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                className={inputModalClasses}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">URL da imagem (opcional)</label>
            <input
              value={form.imagemURL}
              onChange={(e) => setForm({ ...form, imagemURL: e.target.value })}
              placeholder="https://..."
              className={inputModalClasses}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-2.5 rounded-lg bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
