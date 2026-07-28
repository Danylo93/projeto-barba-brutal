'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import { API_BASE } from '@/lib/api-base'

function EsqueciSenhaContent() {
  const params = useSearchParams()
  const tenantParam = params.get('tenant')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const body: any = { email }
      if (tenantParam) body.tenantId = Number(tenantParam)

      const res = await fetch(`${API_BASE}/auth/recuperar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao solicitar recuperação')
      }

      setEnviado(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

  if (enviado) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-2xl font-bold text-white">E-mail enviado</h1>
          <p className="text-sm text-zinc-400">
            Se o e-mail <strong className="text-white">{email}</strong> estiver cadastrado,
            você receberá as instruções para redefinir sua senha em instantes.
          </p>
          <p className="text-xs text-zinc-500">Não esqueça de verificar a caixa de spam.</p>
          <a
            href={tenantParam ? `/login?tenant=${tenantParam}` : '/login'}
            className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold"
          >
            ← Voltar para o login
          </a>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail cadastrado"
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
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <a
          href={tenantParam ? `/login?tenant=${tenantParam}` : '/login'}
          className="text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Lembrou a senha? Faça login
        </a>
      </div>
    </AuthShell>
  )
}

export default function EsqueciSenhaPage() {
  return (
    <Suspense fallback={
      <AuthShell>
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-800 border-t-yellow-400" />
        </div>
      </AuthShell>
    }>
      <EsqueciSenhaContent />
    </Suspense>
  )
}