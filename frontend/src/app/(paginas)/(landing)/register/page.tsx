'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSessao from '@/data/hooks/useSessao'
import AuthShell from '@/components/auth/AuthShell'
import { formatarTelefone, formatarTelefoneInput, validarEmail, validarTelefone } from '@/lib/agendamento-utils'
import { useToast } from '@/hooks/use-toast'

const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 ' +
    'focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors'

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
        cnpj: '',
        aceitoTermos: false,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefone?: string }>({})

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setFieldErrors({})

        // Validação de email e telefone
        const erroEmail = validarEmail(formData.email)
        const erroTelefone = validarTelefone(formData.telefone)
        if (erroEmail || erroTelefone) {
            setFieldErrors({ email: erroEmail || undefined, telefone: erroTelefone || undefined })
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
                    cnpj: formData.cnpj || undefined,
                }),
            })
            const data = await response.json().catch(() => ({}))

            if (!response.ok || !data.access_token) {
                const msg = data.message || 'Erro ao criar conta'
                setError(msg)
                toastError('Não foi possível criar a conta', msg)
                return
            }

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
                    <input
                        type="text"
                        name="cnpj"
                        value={formData.cnpj}
                        onChange={handleChange}
                        placeholder="CNPJ (opcional)"
                        className={inputClasses}
                    />
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
