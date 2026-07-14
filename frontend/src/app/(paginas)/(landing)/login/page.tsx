'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSessao from '@/data/hooks/useSessao'
import AuthShell from '@/components/auth/AuthShell'
import { formatarTelefone, formatarTelefoneInput } from '@/lib/agendamento-utils'

type Modo = 'entrar' | 'cadastrar'

const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

function LoginContent() {
    const router = useRouter()
    const params = useSearchParams()
    const { criarSessao } = useSessao()

    const [modo, setModo] = useState<Modo>('entrar')
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const destino = params.get('destino')
    const tenantIdPadrao = Number(process.env.NEXT_PUBLIC_TENANT_DEFAULT_ID || 1)

    function irPara(padraoDoPapel: string, honrarDestino: boolean) {
        // Só o cliente/barbeiro volta para a página que tentou acessar (destino).
        // Dono e admin sempre caem na sua própria área, independente do destino.
        const alvo = honrarDestino && destino ? destino : padraoDoPapel
        // Aguardar um pouco para o contexto de sessão atualizar
        setTimeout(() => router.push(alvo), 100)
    }

    // Login único: tenta barbearia (dono) → admin do SaaS → cliente/barbeiro.
    // Cada papel tem sua home; só o cliente honra o ?destino=.
    async function entrar() {
        const credenciais = { email, senha }
        const tentativas: Array<{ url: string; body: any; home: string; honrarDestino: boolean }> = [
            { url: '/api/auth/tenant/login', body: credenciais, home: '/dashboard', honrarDestino: false },
            { url: '/api/auth/admin/login', body: credenciais, home: '/admin', honrarDestino: false },
            {
                url: '/api/auth/usuario/login',
                body: { ...credenciais, tenantId: tenantIdPadrao },
                home: '/agendamento',
                honrarDestino: true,
            },
        ]

        let ultimaMensagem = ''
        for (const tentativa of tentativas) {
            const response = await fetch(tentativa.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tentativa.body),
            })
            const data = await response.json().catch(() => ({}))

            if (response.ok && data.access_token) {
                criarSessao(data.access_token)
                irPara(tentativa.home, tentativa.honrarDestino)
                return
            }
            ultimaMensagem = data.message || ''
        }
        throw new Error(ultimaMensagem || 'Email ou senha inválidos')
    }

    // Cadastro de cliente na barbearia (para agendar serviços).
    async function cadastrar() {
        const response = await fetch('/api/auth/usuario/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                email,
                senha,
                telefone,
                barbeiro: false,
                tenantId: tenantIdPadrao,
            }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.access_token) {
            throw new Error(data.message || 'Não foi possível criar a conta')
        }
        criarSessao(data.access_token)
        irPara('/agendamento', true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (modo === 'entrar') {
                await entrar()
            } else {
                await cadastrar()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    function trocarModo(novo: Modo) {
        setModo(novo)
        setError('')
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">
                    {modo === 'entrar' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    {modo === 'entrar'
                        ? 'Entre com sua conta — cliente, barbeiro ou dono'
                        : 'Cadastre-se para agendar seus horários'}
                </p>
            </div>

            {/* Abas Entrar / Criar conta */}
            <div className="grid grid-cols-2 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                <button
                    type="button"
                    onClick={() => trocarModo('entrar')}
                    className={`py-2 rounded-md text-sm font-semibold transition-colors ${
                        modo === 'entrar'
                            ? 'bg-yellow-400 text-zinc-900'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Entrar
                </button>
                <button
                    type="button"
                    onClick={() => trocarModo('cadastrar')}
                    className={`py-2 rounded-md text-sm font-semibold transition-colors ${
                        modo === 'cadastrar'
                            ? 'bg-yellow-400 text-zinc-900'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Criar conta
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                    <div className="bg-red-950/60 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {modo === 'cadastrar' && (
                    <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome"
                        className={inputClasses}
                    />
                )}

                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    className={inputClasses}
                />

                <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Senha"
                    className={inputClasses}
                />

                {modo === 'cadastrar' && (
                    <input
                        type="tel"
                        required
                        value={formatarTelefone(telefone)}
                        onChange={(e) => setTelefone(formatarTelefoneInput(e.target.value))}
                        placeholder="Telefone"
                        className={inputClasses}
                    />
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
                >
                    {loading
                        ? 'Aguarde...'
                        : modo === 'entrar'
                          ? 'Entrar'
                          : 'Criar conta e agendar'}
                </button>
            </form>

            <div className="border-t border-zinc-800 pt-4 text-center">
                <p className="text-sm text-zinc-400">
                    É dono de barbearia?{' '}
                    <Link
                        href="/register"
                        className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors"
                    >
                        Cadastre seu negócio grátis
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <AuthShell>
            <Suspense fallback={<div className="text-zinc-400 text-center">Carregando...</div>}>
                <LoginContent />
            </Suspense>
        </AuthShell>
    )
}
