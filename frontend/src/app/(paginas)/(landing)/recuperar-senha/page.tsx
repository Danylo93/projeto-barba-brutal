'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { useToast } from '@/hooks/use-toast'

const input =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

function Conteudo() {
    const params = useSearchParams()
    const { error: toastErro } = useToast()
    const [email, setEmail] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [enviado, setEnviado] = useState(false)

    // Cliente/barbeiro chega pela página da barbearia (?tenant=), o dono não.
    const tenantParam = Number(params.get('tenant'))
    const tenantId = Number.isFinite(tenantParam) && tenantParam > 0 ? tenantParam : undefined

    async function enviar(e: React.FormEvent) {
        e.preventDefault()
        setEnviando(true)
        try {
            const r = await fetch('/api-backend/auth/senha/recuperar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, tenantId }),
            })
            if (!r.ok) throw new Error('Não foi possível enviar agora.')
            setEnviado(true)
        } catch (err) {
            toastErro(
                'Erro ao enviar',
                err instanceof Error ? err.message : 'Tente de novo em instantes.',
            )
        } finally {
            setEnviando(false)
        }
    }

    if (enviado) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
                    <MailCheck size={28} />
                </span>
                <h1 className="text-2xl font-bold text-white">Confira seu e-mail</h1>
                {/* Mensagem igual existindo ou não a conta: dizer "e-mail não
                    encontrado" entregaria quais e-mails têm cadastro aqui. */}
                <p className="text-sm leading-relaxed text-zinc-400">
                    Se houver uma conta com <strong className="text-zinc-300">{email}</strong>,
                    enviamos o link para redefinir a senha. Ele vale por 1 hora.
                </p>
                <p className="text-sm text-zinc-500">
                    Não chegou? Olhe o spam ou{' '}
                    <button
                        onClick={() => setEnviado(false)}
                        className="text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
                    >
                        tente de novo
                    </button>
                    .
                </p>
                <Link href="/login" className="mt-2 text-sm text-zinc-400 hover:text-white">
                    Voltar para o login
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Esqueceu a senha?</h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Informe seu e-mail e enviamos um link para você criar uma nova.
                </p>
            </div>

            <form onSubmit={enviar} className="flex flex-col gap-4">
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail"
                    className={input}
                />
                <button
                    type="submit"
                    disabled={enviando}
                    className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-zinc-900 transition-colors hover:bg-yellow-300 disabled:opacity-60"
                >
                    {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
            </form>

            <Link href="/login" className="text-center text-sm text-zinc-400 hover:text-white">
                Voltar para o login
            </Link>
        </div>
    )
}

export default function RecuperarSenhaPage() {
    return (
        <AuthShell>
            <Suspense fallback={<div className="h-64" />}>
                <Conteudo />
            </Suspense>
        </AuthShell>
    )
}
