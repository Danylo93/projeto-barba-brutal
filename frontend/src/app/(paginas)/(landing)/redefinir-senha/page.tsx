'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { useToast } from '@/hooks/use-toast'

const input =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

function Conteudo() {
    const router = useRouter()
    const params = useSearchParams()
    const { success, error: toastErro } = useToast()

    const token = params.get('token') || ''
    const tenant = params.get('tenant')

    const [senha, setSenha] = useState('')
    const [confirmar, setConfirmar] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [pronto, setPronto] = useState(false)

    async function redefinir(e: React.FormEvent) {
        e.preventDefault()
        if (senha.length < 6) {
            toastErro('Senha curta', 'Use ao menos 6 caracteres.')
            return
        }
        if (senha !== confirmar) {
            toastErro('As senhas não conferem', 'Digite a mesma senha nos dois campos.')
            return
        }
        setSalvando(true)
        try {
            const r = await fetch('/api-backend/auth/senha/redefinir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, senha }),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.message || 'Não foi possível redefinir a senha.')
            setPronto(true)
            success('Senha alterada', 'Você já pode entrar com a nova senha.')
            setTimeout(() => router.push(tenant ? `/login?tenant=${tenant}` : '/login'), 1800)
        } catch (err) {
            toastErro(
                'Não foi possível redefinir',
                err instanceof Error ? err.message : 'Peça a recuperação de novo.',
            )
        } finally {
            setSalvando(false)
        }
    }

    if (!token) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <h1 className="text-2xl font-bold text-white">Link inválido</h1>
                <p className="text-sm text-zinc-400">
                    Esse endereço não tem um código de recuperação. Peça um link novo.
                </p>
                <Link
                    href="/recuperar-senha"
                    className="rounded-lg bg-yellow-400 px-5 py-3 font-bold text-zinc-900 hover:bg-yellow-300"
                >
                    Pedir novo link
                </Link>
            </div>
        )
    }

    if (pronto) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
                    <ShieldCheck size={28} />
                </span>
                <h1 className="text-2xl font-bold text-white">Senha alterada</h1>
                <p className="text-sm text-zinc-400">Levando você para o login…</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Criar nova senha</h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Escolha uma senha que você lembre, com ao menos 6 caracteres.
                </p>
            </div>

            <form onSubmit={redefinir} className="flex flex-col gap-4">
                <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Nova senha"
                    className={input}
                />
                <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={input}
                />
                <button
                    type="submit"
                    disabled={salvando}
                    className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-zinc-900 transition-colors hover:bg-yellow-300 disabled:opacity-60"
                >
                    {salvando ? 'Salvando...' : 'Salvar nova senha'}
                </button>
            </form>
        </div>
    )
}

export default function RedefinirSenhaPage() {
    return (
        <AuthShell>
            <Suspense fallback={<div className="h-64" />}>
                <Conteudo />
            </Suspense>
        </AuthShell>
    )
}
