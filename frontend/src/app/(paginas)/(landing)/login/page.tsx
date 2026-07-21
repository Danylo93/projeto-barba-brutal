'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSessao from '@/data/hooks/useSessao'
import AuthShell from '@/components/auth/AuthShell'
import { API_BASE } from '@/lib/api-base'
import { formatarTelefone, formatarTelefoneInput } from '@/lib/agendamento-utils'
import { useToast } from '@/hooks/use-toast'

type Modo = 'entrar' | 'cadastrar'

const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

function LoginContent() {
    const router = useRouter()
    const params = useSearchParams()
    const { criarSessao } = useSessao()
    const { error: toastErro, warning: toastAviso } = useToast()

    const [modo, setModo] = useState<Modo>('entrar')
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [loading, setLoading] = useState(false)

    const destino = params.get('destino')
    // Barbearia (tenant) de origem: quando o cliente chega pela landing pública
    // /barbearia/<x>, o id do tenant vem em ?tenant=. Sem isso, usa o padrão.
    const tenantParam = Number(params.get('tenant'))
    // Quando há ?tenant=, estamos no login DO SITE DA BARBEARIA (só cliente e
    // profissional daquela barbearia). Sem isso, é o login DO SAAS (só o admin
    // do sistema e o dono/administrador da barbearia).
    const contextoBarbearia = Number.isFinite(tenantParam) && tenantParam > 0
    const tenantId = contextoBarbearia
        ? tenantParam
        : Number(process.env.NEXT_PUBLIC_TENANT_DEFAULT_ID || 1)

    // Quando o cliente chega por uma barbearia específica (?tenant=), mostramos
    // o nome dela na tela de login em vez da marca do sistema.
    const [barbeariaNome, setBarbeariaNome] = useState<string | undefined>()
    useEffect(() => {
        if (!(tenantParam > 0)) return
        fetch(`${API_BASE}/tenants/publico/${tenantParam}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.nome && setBarbeariaNome(d.nome))
            .catch(() => {})
    }, [tenantParam])

    function irPara(padraoDoPapel: string, honrarDestino: boolean) {
        // Só o cliente/barbeiro volta para a página que tentou acessar (destino).
        // Dono e admin sempre caem na sua própria área, independente do destino.
        const alvo = honrarDestino && destino ? destino : padraoDoPapel
        // Aguardar um pouco para o contexto de sessão atualizar
        setTimeout(() => router.push(alvo), 100)
    }

    // Tenta autenticar num endpoint específico. Não cria sessão — só devolve se
    // as credenciais são válidas ali (usado também para "sondar" o papel e avisar
    // quando alguém tenta entrar na página errada).
    async function tentar(url: string, body: Record<string, unknown>) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        const data = await response.json().catch(() => ({}))
        return { ok: response.ok && !!data.access_token, data }
    }

    // Login segregado por contexto:
    //  - SAAS (sem ?tenant=): só admin do sistema e dono/administrador da barbearia.
    //  - SITE DA BARBEARIA (com ?tenant=): só cliente e profissional daquela barbearia.
    // Se a conta pertence ao outro contexto, mostramos um toast orientando a página certa.
    async function entrar() {
        const cred = { email, senha }

        if (contextoBarbearia) {
            const usuario = await tentar('/api/auth/usuario/login', { ...cred, tenantId })
            if (usuario.ok) {
                criarSessao(usuario.data.access_token)
                irPara('/agendamento', true)
                return
            }
            // Credencial de administração usada na página do cliente?
            const dono = await tentar('/api/auth/tenant/login', cred)
            const admin = dono.ok ? dono : await tentar('/api/auth/admin/login', cred)
            if (dono.ok || admin.ok) {
                toastAviso(
                    'Conta de administração',
                    'Esta é uma conta de dono/administrador. Acesse pelo painel do sistema, não pela página da barbearia.',
                )
                return
            }
            throw new Error(usuario.data.message || 'Email ou senha inválidos')
        }

        // Contexto SaaS
        const dono = await tentar('/api/auth/tenant/login', cred)
        if (dono.ok) {
            criarSessao(dono.data.access_token)
            irPara('/dashboard', false)
            return
        }
        const admin = await tentar('/api/auth/admin/login', cred)
        if (admin.ok) {
            criarSessao(admin.data.access_token)
            irPara('/admin', false)
            return
        }
        // Credencial de cliente/profissional usada na página do SaaS?
        const usuario = await tentar('/api/auth/usuario/login', { ...cred, tenantId })
        if (usuario.ok) {
            toastAviso(
                'Conta de cliente ou profissional',
                'Para entrar e agendar, use a página da sua barbearia.',
            )
            return
        }
        throw new Error(dono.data.message || admin.data.message || 'Email ou senha inválidos')
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
                tenantId,
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
        setLoading(true)
        try {
            if (modo === 'entrar') {
                await entrar()
            } else {
                await cadastrar()
            }
        } catch (err) {
            toastErro(
                'Não foi possível entrar',
                err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.',
            )
        } finally {
            setLoading(false)
        }
    }

    function trocarModo(novo: Modo) {
        setModo(novo)
    }

    return (
        <AuthShell nome={barbeariaNome}>
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">
                    {modo === 'entrar' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    {modo === 'cadastrar'
                        ? 'Cadastre-se para agendar seus horários'
                        : contextoBarbearia
                          ? 'Entre como cliente ou profissional da barbearia'
                          : 'Entre como administrador do sistema ou dono de barbearia'}
                </p>
            </div>

            {/* Abas Entrar / Criar conta — o cadastro de cliente só existe no
                site da barbearia (com ?tenant=). No login do SaaS não faz sentido. */}
            {contextoBarbearia && (
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
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        </div>
        </AuthShell>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <AuthShell>
                <div className="flex flex-col justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-800 border-t-yellow-400"></div>
                </div>
            </AuthShell>
        }>
            <LoginContent />
        </Suspense>
    )
}
