'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSessao from '@/data/hooks/useSessao'
import AuthShell from '@/components/auth/AuthShell'
import { formatarTelefone, formatarTelefoneInput, validarEmail, validarTelefone } from '@/lib/agendamento-utils'
import { useToast } from '@/hooks/use-toast'
import { registrarAceiteDeTermos } from '@/lib/registrar-aceite'
import { formatarDocumentoInput, limparDocumento, validarDocumento } from '@/lib/documento'
import { Globe, Check, X, Loader2 } from 'lucide-react'

const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

/** Domínio raiz para mostrar o preview do subdomínio. */
const DOMINIO_RAIZ = process.env.NEXT_PUBLIC_DOMINIO_RAIZ || 'barbeariabrutal.com'

/** Normalização de slug no client — replica a lógica do backend de forma simplificada. */
function normalizarSlugLocal(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[\s_.]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63)
        .replace(/-+$/, '')
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export default function RegisterPage() {
    const router = useRouter()
    const { criarSessao } = useSessao()
    const { error: toastError } = useToast()
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        senha: '',
        confirmarSenha: '',
        endereco: '',
        documento: '',
        subdominio: '',
        aceitoTermos: false,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefone?: string }>({})
    const [erroDocumento, setErroDocumento] = useState<string | null>(null)

    // Estado do verificador de subdomínio
    const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
    const [slugNormalizado, setSlugNormalizado] = useState('')
    const [slugMensagem, setSlugMensagem] = useState('')
    const [subdominioEditado, setSubdominioEditado] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    // Auto-gerar sugestão de subdomínio quando o nome muda (se não foi editado manualmente)
    useEffect(() => {
        if (!subdominioEditado && formData.nome) {
            const slug = normalizarSlugLocal(formData.nome)
            setFormData((prev) => ({ ...prev, subdominio: slug }))
        }
    }, [formData.nome, subdominioEditado])

    // Verificar disponibilidade com debounce
    const verificarSlug = useCallback(async (slug: string) => {
        if (!slug || slug.length < 3) {
            setSlugStatus('idle')
            setSlugNormalizado('')
            setSlugMensagem('')
            return
        }

        setSlugStatus('checking')
        try {
            const res = await fetch(`/api/tenants/verificar-slug/${encodeURIComponent(slug)}`)
            const data = await res.json()

            setSlugNormalizado(data.slug || slug)
            if (data.disponivel) {
                setSlugStatus('available')
                setSlugMensagem('')
            } else {
                setSlugStatus('unavailable')
                setSlugMensagem(data.mensagem || 'Indisponível')
            }
        } catch {
            setSlugStatus('idle')
            setSlugMensagem('Erro ao verificar. Tente novamente.')
        }
    }, [])

    // Debounce da verificação quando o subdomínio muda
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        const slug = normalizarSlugLocal(formData.subdominio)
        if (!slug || slug.length < 3) {
            setSlugStatus('idle')
            setSlugNormalizado('')
            setSlugMensagem('')
            return
        }

        debounceRef.current = setTimeout(() => {
            verificarSlug(slug)
        }, 500)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [formData.subdominio, verificarSlug])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setFieldErrors({})
        setErroDocumento(null)

        // Validação de email e telefone
        const erroEmail = validarEmail(formData.email)
        const erroTelefone = validarTelefone(formData.telefone)
        if (erroEmail || erroTelefone) {
            setFieldErrors({ email: erroEmail || undefined, telefone: erroTelefone || undefined })
            return
        }

        // Uma barbearia por CPF/CNPJ: é o que impede abrir conta atrás de conta
        // com e-mails diferentes para renovar o teste grátis.
        const erroDoc = validarDocumento(formData.documento)
        if (erroDoc) {
            setErroDocumento(erroDoc)
            toastError('Verifique os dados', erroDoc)
            return
        }

        if (formData.senha !== formData.confirmarSenha) {
            setError('As senhas não coincidem')
            toastError('Verifique os dados', 'As senhas não coincidem.')
            return
        }
        if (!formData.aceitoTermos) {
            setError('Você deve aceitar os termos de uso')
            toastError('Verifique os dados', 'Você deve aceitar os termos de uso.')
            return
        }

        // Se o slug foi preenchido mas não está disponível, bloqueia
        const slugFinal = normalizarSlugLocal(formData.subdominio)
        if (slugFinal && slugFinal.length >= 3 && slugStatus === 'unavailable') {
            setError('O endereço escolhido não está disponível. Escolha outro.')
            toastError('Endereço indisponível', 'Escolha outro endereço para sua barbearia.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/auth/tenant/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: formData.nome,
                    email: formData.email,
                    telefone: formData.telefone.replace(/\D/g, ''),
                    senha: formData.senha,
                    endereco: formData.endereco || undefined,
                    documento: limparDocumento(formData.documento),
                    dominio: slugFinal && slugFinal.length >= 3 ? slugFinal : undefined,
                }),
            })
            const data = await response.json().catch(() => ({}))

            if (!response.ok || !data.access_token) {
                const msg = data.message || 'Erro ao criar conta'
                setError(msg)
                toastError('Não foi possível criar a conta', msg)
                return
            }

            // Prova do aceite dos termos, exigida pela LGPD (art. 8º, §1º).
            await registrarAceiteDeTermos(data.access_token)

            // Sessão do app vive em cookie (ContextoSessao), não em localStorage.
            // Novo dono ainda não tem plano ativo → leva para escolher o plano.
            criarSessao(data.access_token)
            setTimeout(() => router.push('/planos'), 100)
        } catch (err) {
            setError('Erro de conexão. Tente novamente.')
            toastError('Erro de conexão', 'Tente novamente em instantes.')
        } finally {
            setLoading(false)
        }
    }

    const slugPreview = normalizarSlugLocal(formData.subdominio)

    return (
        <AuthShell>
            <div className="flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white">Cadastre sua barbearia</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Comece grátis e gerencie agendamentos, equipe e clientes
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-950/60 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <input
                        type="text"
                        name="nome"
                        required
                        value={formData.nome}
                        onChange={handleChange}
                        placeholder="Nome da barbearia"
                        className={inputClasses}
                    />

                    {/* Escolha de subdomínio */}
                    <div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Globe size={16} className="text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                name="subdominio"
                                value={formData.subdominio}
                                onChange={(e) => {
                                    setSubdominioEditado(true)
                                    setFormData((prev) => ({
                                        ...prev,
                                        subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                                    }))
                                }}
                                placeholder="seu-endereco"
                                className={`${inputClasses} pl-9 pr-10 ${
                                    slugStatus === 'available'
                                        ? 'border-green-500/60 focus:border-green-500 focus:ring-green-500'
                                        : slugStatus === 'unavailable'
                                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
                                          : ''
                                }`}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {slugStatus === 'checking' && (
                                    <Loader2 size={16} className="text-zinc-400 animate-spin" />
                                )}
                                {slugStatus === 'available' && (
                                    <Check size={16} className="text-green-400" />
                                )}
                                {slugStatus === 'unavailable' && (
                                    <X size={16} className="text-red-400" />
                                )}
                            </div>
                        </div>

                        {/* Preview do endereço */}
                        {slugPreview && slugPreview.length >= 3 ? (
                            <div className="mt-1.5 flex items-center gap-1.5">
                                {slugStatus === 'available' ? (
                                    <p className="text-xs text-green-400">
                                        ✓ Disponível —{' '}
                                        <span className="font-mono font-medium">
                                            {slugNormalizado || slugPreview}.{DOMINIO_RAIZ}
                                        </span>
                                    </p>
                                ) : slugStatus === 'unavailable' ? (
                                    <p className="text-xs text-red-400">
                                        ✗ {slugMensagem}
                                    </p>
                                ) : slugStatus === 'checking' ? (
                                    <p className="text-xs text-zinc-400">
                                        Verificando disponibilidade...
                                    </p>
                                ) : (
                                    <p className="text-xs text-zinc-500">
                                        Seu endereço será{' '}
                                        <span className="font-mono text-zinc-400">
                                            {slugPreview}.{DOMINIO_RAIZ}
                                        </span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="mt-1 text-xs text-zinc-500">
                                Escolha o endereço online da sua barbearia (mínimo 3 caracteres).
                            </p>
                        )}
                    </div>

                    <div>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="E-mail"
                            className={`${inputClasses} ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {fieldErrors.email && (
                            <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                        )}
                    </div>
                    <div>
                        <input
                            type="tel"
                            name="telefone"
                            required
                            value={formatarTelefone(formData.telefone)}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    telefone: formatarTelefoneInput(e.target.value),
                                }))
                            }
                            placeholder="WhatsApp (DDD + número)"
                            className={`${inputClasses} ${fieldErrors.telefone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {fieldErrors.telefone && (
                            <p className="text-red-400 text-xs mt-1">{fieldErrors.telefone}</p>
                        )}
                    </div>
                    <input
                        type="text"
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleChange}
                        placeholder="Endereço (opcional)"
                        className={inputClasses}
                    />
                    <div>
                        <input
                            type="text"
                            name="documento"
                            required
                            inputMode="text"
                            value={formData.documento}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    documento: formatarDocumentoInput(e.target.value),
                                })
                            }
                            placeholder="CPF ou CNPJ da barbearia"
                            className={`${inputClasses} ${erroDocumento ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {erroDocumento ? (
                            <p className="mt-1 text-xs text-red-400">{erroDocumento}</p>
                        ) : (
                            <p className="mt-1 text-xs text-zinc-500">
                                Uma conta por CPF/CNPJ. Se você é MEI ou autônomo, use o CPF.
                            </p>
                        )}
                    </div>
                    <input
                        type="password"
                        name="senha"
                        required
                        minLength={6}
                        value={formData.senha}
                        onChange={handleChange}
                        placeholder="Senha"
                        className={inputClasses}
                    />
                    <input
                        type="password"
                        name="confirmarSenha"
                        required
                        minLength={6}
                        value={formData.confirmarSenha}
                        onChange={handleChange}
                        placeholder="Confirmar senha"
                        className={inputClasses}
                    />

                    <label className="flex items-start gap-2 text-sm text-zinc-400 select-none">
                        <input
                            type="checkbox"
                            name="aceitoTermos"
                            checked={formData.aceitoTermos}
                            onChange={handleChange}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-yellow-400"
                        />
                        <span>
                            Li e aceito os{' '}
                            <Link href="/terms" className="text-yellow-400 hover:text-yellow-300">
                                termos de uso
                            </Link>{' '}
                            e a{' '}
                            <Link href="/privacy" className="text-yellow-400 hover:text-yellow-300">
                                política de privacidade
                            </Link>
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 disabled:opacity-60 transition-colors"
                    >
                        {loading ? 'Criando conta...' : 'Criar conta grátis'}
                    </button>
                </form>

                <div className="border-t border-zinc-800 pt-4 text-center">
                    <p className="text-sm text-zinc-400">
                        Já tem conta?{' '}
                        <Link
                            href="/login"
                            className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors"
                        >
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </AuthShell>
    )
}
