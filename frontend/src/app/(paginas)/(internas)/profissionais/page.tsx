'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Edit2, Star } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import Modal, { inputModalClasses } from '@/components/painel/Modal'
import { Skeleton } from '@/components/ui/skeleton'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useToast } from '@/hooks/use-toast'

interface Profissional {
  id: number
  nome: string
  descricao: string
  imagemUrl: string
  avaliacao: number
  quantidadeAvaliacoes: number
  ativo: boolean
  createdAt: string
}

const formVazio = { nome: '', descricao: '', imagemUrl: '', email: '', senha: '', telefone: '' }

export default function ProfissionaisPage() {
  const { httpGet, httpPost, httpPut, httpDelete } = useAPI()
  const { success, error: toastError } = useToast()
  
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState<number | null>(null)
  
  const [editando, setEditando] = useState<Profissional | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetchProfissionais()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfissionais = async () => {
    try {
      setLoading(true)
      const data = await httpGet('profissionais')
      setProfissionais(Array.isArray(data) ? data : [])
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

  const abrirEdicao = (p: Profissional) => {
    setEditando(p)
    setForm({ 
      nome: p.nome, 
      descricao: p.descricao, 
      imagemUrl: p.imagemUrl || '',
      email: '',
      senha: '',
      telefone: ''
    })
    setError('')
    setModalAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setError('')
    try {
      const payload: any = {
        nome: form.nome,
        descricao: form.descricao,
        imagemUrl: form.imagemUrl,
      }
      if (form.email) payload.email = form.email
      if (form.senha) payload.senha = form.senha
      if (form.telefone) payload.telefone = form.telefone
      const resposta = editando
        ? await httpPut(`profissionais/${editando.id}`, payload)
        : await httpPost('profissionais', payload)
      if (resposta?.statusCode >= 400 || resposta?.message) {
        throw new Error(resposta.message || 'Não foi possível salvar')
      }
      setModalAberto(false)
      await fetchProfissionais()
      success('Profissional salvo', 'As informações foram atualizadas com sucesso.')
    } catch (err) {
      toastError('Erro ao salvar', err instanceof Error ? err.message : 'Erro desconhecido')
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async () => {
    if (confirmarExclusao === null) return
    const id = confirmarExclusao
    try {
      await httpDelete(`profissionais/${id}`)
      setProfissionais(profissionais.filter((p) => p.id !== id))
      success('Profissional excluído', 'O profissional foi removido com sucesso.')
    } catch (err) {
      toastError('Erro ao excluir', err instanceof Error ? err.message : 'Erro ao deletar profissional')
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Profissionais</h1>
            <p className="text-zinc-400 mt-2">Gerencie todos os profissionais da sua barbearia</p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Novo Profissional
          </button>
        </div>

        {error && !modalAberto && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
                <Skeleton className="h-40 w-full bg-zinc-800" />
                <Skeleton className="h-6 w-3/4 bg-zinc-800" />
                <Skeleton className="h-4 w-full bg-zinc-800" />
                <Skeleton className="h-4 w-1/2 bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {!loading && profissionais.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800 animate-fade-in">
            <Users size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum profissional cadastrado</h3>
            <p className="text-zinc-400 mb-6">Comece adicionando seu primeiro profissional</p>
            <button
              onClick={abrirNovo}
              className="inline-block bg-yellow-400 text-zinc-900 font-semibold px-6 py-2 rounded-lg hover:bg-yellow-300 active:scale-[0.98] transition-all"
            >
              Adicionar Profissional
            </button>
          </div>
        )}

        {!loading && profissionais.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {profissionais.map((profissional) => (
              <div
                key={profissional.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors overflow-hidden"
              >
                <div className="relative h-40 bg-zinc-800 flex items-center justify-center">
                  <Users size={48} className="text-zinc-600" />
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-white">{profissional.nome}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        profissional.ativo
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {profissional.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{profissional.descricao}</p>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < Math.round(profissional.avaliacao)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-zinc-700'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-400">
                      {profissional.avaliacao.toFixed(1)} ({profissional.quantidadeAvaliacoes})
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => abrirEdicao(profissional)}
                      className="flex-1 flex items-center justify-center gap-2 text-zinc-300 hover:text-yellow-400 py-2 transition-colors"
                    >
                      <Edit2 size={18} />
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmarExclusao(profissional.id)}
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
        titulo="Deletar Profissional"
        mensagem="Tem certeza que deseja excluir este profissional? Esta ação não poderá ser desfeita e ele perderá o acesso ao sistema."
        textoConfirmar="Deletar"
        onConfirmar={handleDelete}
        onCancelar={() => setConfirmarExclusao(null)}
      />

      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar Profissional' : 'Novo Profissional'}
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
              placeholder="Nome do profissional"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Descrição</label>
            <textarea
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Especialidade / bio"
              rows={3}
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">URL da foto (opcional)</label>
            <input
              value={form.imagemUrl}
              onChange={(e) => setForm({ ...form, imagemUrl: e.target.value })}
              placeholder="https://..."
              className={inputModalClasses}
            />
          </div>
          <hr className="border-zinc-800 my-2" />
          <h4 className="text-sm font-semibold text-white">Criar/Atualizar Acesso (Opcional)</h4>
          <p className="text-xs text-zinc-400 -mt-2 mb-2">
            Preencha para que o profissional possa acessar a própria agenda.
          </p>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">E-mail de Acesso</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Senha</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="******"
              className={inputModalClasses}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Telefone do Profissional</label>
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(11) 99999-9999"
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
