'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSessao from '@/data/hooks/useSessao'
import AuthShell from '@/components/auth/AuthShell'
import { API_BASE } from '@/lib/api-base'
import { formatarTelefone, formatarTelefoneInput, validarEmail, validarTelefone } from '@/lib/agendamento-utils'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { registrarAceiteDeTermos } from '@/lib/registrar-aceite'

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
    const [aceitoTermos, setAceitoTermos] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefone?: string }>({})

    const destino = params.get('destino')
    // Barbearia (tenant) de origem: quando o cliente chega pela landing pública
    // /barbearia/<x>, o id do tenant vem em ?tenant=. Sem isso, tenta o subdomínio.
    const tenantParam = Number(params.get('tenant'))
    
    // Estado para guardar o tenant detectado (via param ou subdomínio)
    const [barbeariaNome, setBarbeariaNome] = useState<string | undefined>()
    const [tenantIdState, setTenantIdState] = useState<number | undefined>(tenantParam > 0 ? tenantParam : undefined)
    const [isSubdomain, setIsSubdomain] = useState(false)

    useEffect(() => {
        // Se tem o parâmetro, carrega direto por ele
        if (tenantParam > 0) {
            fetch(`${API_BASE}/tenants/publico/${tenantParam}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (d?.nome) setBarbeariaNome(d.nome)
                    if (d?.corPrimaria) document.documentElement.style.setProperty('--tenant-primary', d.corPrimaria)
                    if (d?.corSecundaria) document.documentElement.style.setProperty('--tenant-secondary', d.corSecundaria)
                })
                .catch(() => {})
            return
        }

        // Se não tem o parâmetro, tenta ver se está acessando via subdomínio (ex: latita.barbeariabrutal.com)
        const hostname = window.location.hostname
        const parts = hostname.split('.')
        // ignorar localhost, www, etc. Se tiver um subdomínio válido
        if (parts.length >= 3 && parts[0] !== 'www') {
            const slug = parts[0]
            setIsSubdomain(true)
            fetch(`${API_BASE}/tenants/publico/${slug}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (d?.id) {
                        setTenantIdState(d.id)
                        if (d.nome) setBarbeariaNome(d.nome)
                        if (d.corPrimaria) document.documentElement.style.setProperty('--tenant-primary', d.corPrimaria)
                        if (d.corSecundaria) document.documentElement.style.setProperty('--tenant-secondary', d.corSecundaria)
                    }
                })
                .catch(() => {})
        }
    }, [tenantParam])

    // Determina se estamos no contexto de uma barbearia (seja por parametro ou por subdominio detectado)
    const contextoBarbearia = tenantIdState !== undefined && tenantIdState > 0
    const tenantId = contextoBarbearia ? tenantIdState : Number(process.env.NEXT_PUBLIC_TENANT_DEFAULT_ID || 1)

    function irPara(padraoDoPapel: string, honrarDestino: boolean) {
        // Só o cliente/barbeiro volta para a página que tentou acessar (destino).
        // Dono e admin sempre caem na sua própria área, independente do destino.
        const alvo = honrarDestino && destino ? destino : padraoDoPapel
        // Aguardar um pouco para o contexto de sessão atualizar
        setTimeout(() => router.push(alvo), 100)
    }

    /**
     * Uma requisição, direto na API.
     *
     * Antes eram até TRÊS chamadas em sequência para descobrir o papel (dono,
     * admin, cliente), e cada uma passava por uma função da Vercel antes de
     * chegar no backend. Quatro saltos por tentativa, três tentativas: com o
     * Render acordando de um lado e a função da Vercel do outro, um login
     * errado levava vários segundos. Quem decide o papel agora é o servidor.
     */
    async function tentar(body: Record<string, unknown>) {
        const response = await fetch(`${API_BASE}/auth/login`, {
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
        // No contexto da barbearia manda o tenantId; no do SaaS, não. É esse
        // campo que diz ao servidor qual porta a pessoa está usando.
        const { ok, data } = await tentar(
            contextoBarbearia ? { email, senha, tenantId } : { email, senha },
        )

        if (ok) {
            criarSessao(data.access_token)
            const destinoPorPapel: Record<string, [string, boolean]> = {
                usuario: ['/agendamento', true],
                tenant: ['/dashboard', false],
                admin: ['/admin', false],
            }
            const [padrao, honrarDestino] = destinoPorPapel[data.papel] ?? [
                '/agendamento',
                true,
            ]
            irPara(padrao, honrarDestino)
            return
        }

        // Credencial certa, página errada: o servidor avisa qual é qual.
        if (data.contextoErrado === 'administracao') {
            toastAviso('Conta de administração', data.message)
            return
        }
        if (data.contextoErrado === 'cliente') {
            toastAviso('Conta de cliente ou profissional', data.message)
            return
        }

        throw new Error(data.message || 'Email ou senha inválidos')
    }

    // Cadastro de cliente na barbearia (para agendar serviços).
    async function cadastrar() {
        // Validação de email e telefone
        const erroEmail = validarEmail(email)
        const erroTelefone = validarTelefone(telefone)
        if (erroEmail || erroTelefone) {
            setFieldErrors({ email: erroEmail || undefined, telefone: erroTelefone || undefined })
            return
        }
        if (!aceitoTermos) {
            throw new Error('Aceite os termos de uso e a política de privacidade para continuar.')
        }

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
        // Prova do aceite, exigida pela LGPD (art. 8º, §1º).
        await registrarAceiteDeTermos(data.access_token, tenantId)
        criarSessao(data.access_token)
        irPara('/agendamento', true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setFieldErrors({})
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
        setError('')
        setFieldErrors({})
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
                          ? 'Acesse sua conta para continuar'
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

                <div>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-mail"
                        className={`${inputClasses} ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {fieldErrors.email && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                    )}
                </div>

                <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Senha"
                    className={inputClasses}
                />

                {modo === 'entrar' && (
                    <div className="text-right -mt-2">
                        <Link
                            href={contextoBarbearia ? `/recuperar-senha?tenant=${tenantParam}` : '/recuperar-senha'}
                            className="text-xs text-zinc-500 hover:text-yellow-400 transition-colors"
                        >
                            Esqueci minha senha
                        </Link>
                    </div>
                )}

                {modo === 'cadastrar' && (
                    <div>
                        <input
                            type="tel"
                            required
                            value={formatarTelefone(telefone)}
                            onChange={(e) => setTelefone(formatarTelefoneInput(e.target.value))}
                            placeholder="WhatsApp (DDD + número)"
                            className={`${inputClasses} ${fieldErrors.telefone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {fieldErrors.telefone && (
                            <p className="text-red-400 text-xs mt-1">{fieldErrors.telefone}</p>
                        )}
                    </div>
                )}

                {modo === 'cadastrar' && (
                    <label className="flex select-none items-start gap-2 text-sm text-zinc-400">
                        <input
                            type="checkbox"
                            checked={aceitoTermos}
                            onChange={(e) => setAceitoTermos(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 accent-yellow-400"
                        />
                        <span>
                            Li e aceito os{' '}
                            <Link href="/terms" target="_blank" className="text-yellow-400 hover:text-yellow-300">
                                termos de uso
                            </Link>{' '}
                            e a{' '}
                            <Link href="/privacy" target="_blank" className="text-yellow-400 hover:text-yellow-300">
                                política de privacidade
                            </Link>
                            , e concordo em receber mensagens sobre os meus agendamentos.
                        </span>
                    </label>
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
