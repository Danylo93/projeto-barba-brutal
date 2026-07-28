'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import { API_BASE } from '@/lib/api-base'

function RedefinirSenhaContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const tenantParam = params.get('tenant')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmacao) {
      setErro('As senhas não conferem.')
      return
    }

    setLoading(true)
    try {
      const body: any = { token, novaSenha }
      if (tenantParam) body.tenantId = Number(tenantParam)

      const res = await fetch(`${API_BASE}/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao redefinir senha')
      }

      setSucesso(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

  if (!token) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-2xl font-bold text-white">Link inválido</h1>
          <p className="text-sm text-zinc-400">
            Este link de recuperação é inválido. Solicite um novo.
          </p>
          <a
            href="/esqueci-senha"
            className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold"
          >
            Solicitar nova recuperação →
          </a>
        </div>
      </AuthShell>
    )
  }

  if (sucesso) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-2xl font-bold text-white">Senha redefinida!</h1>
          <p className="text-sm text-zinc-400">
            Sua senha foi alterada com sucesso. Agora você pode entrar com a nova senha.
          </p>
          <button
            onClick={() => router.push(tenantParam ? `/login?tenant=${tenantParam}` : '/login')}
            className="w-full py-3 rounded-lg bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
          <p className="text-sm text-zinc-400 mt-1">Escolha uma nova senha para sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            required
            minLength={6}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Nova senha"
            className={inputClasses}
          />

          <input
            type="password"
            required
            minLength={6}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="Confirmar nova senha"
            className={inputClasses}
          />

          {erro && (
            <p className="text-red-400 text-sm text-center">{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <AuthShell>
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-800 border-t-yellow-400" />
        </div>
      </AuthShell>
    }>
      <RedefinirSenhaContent />
    </Suspense>
  )
}