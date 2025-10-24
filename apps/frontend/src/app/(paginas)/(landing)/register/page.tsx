'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        senha: '',
        confirmarSenha: '',
        endereco: '',
        cnpj: '',
        aceitoTermos: false
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (formData.senha !== formData.confirmarSenha) {
            setError('As senhas não coincidem')
            setLoading(false)
            return
        }

        if (!formData.aceitoTermos) {
            setError('Você deve aceitar os termos de uso')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/tenant/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome: formData.nome,
                    email: formData.email,
                    telefone: formData.telefone,
                    senha: formData.senha,
                    endereco: formData.endereco,
                    cnpj: formData.cnpj,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                // Salvar token e redirecionar
                localStorage.setItem('token', data.access_token)
                router.push('/dashboard')
            } else {
                const errorData = await response.json()
                setError(errorData.message || 'Erro ao criar conta')
            }
        } catch (err) {
            setError('Erro de conexão. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Crie sua conta gratuita
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Ou{' '}
                        <Link href="/entrar" className="font-medium text-green-600 hover:text-green-500">
                            faça login na sua conta existente
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                                Nome da Barbearia
                            </label>
                            <input
                                id="nome"
                                name="nome"
                                type="text"
                                required
                                value={formData.nome}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                                Telefone
                            </label>
                            <input
                                id="telefone"
                                name="telefone"
                                type="tel"
                                required
                                value={formData.telefone}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                                Endereço
                            </label>
                            <input
                                id="endereco"
                                name="endereco"
                                type="text"
                                value={formData.endereco}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                                CNPJ (opcional)
                            </label>
                            <input
                                id="cnpj"
                                name="cnpj"
                                type="text"
                                value={formData.cnpj}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
                                Senha
                            </label>
                            <input
                                id="senha"
                                name="senha"
                                type="password"
                                required
                                value={formData.senha}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700">
                                Confirmar Senha
                            </label>
                            <input
                                id="confirmarSenha"
                                name="confirmarSenha"
                                type="password"
                                required
                                value={formData.confirmarSenha}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="aceitoTermos"
                            name="aceitoTermos"
                            type="checkbox"
                            checked={formData.aceitoTermos}
                            onChange={handleChange}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label htmlFor="aceitoTermos" className="ml-2 block text-sm text-gray-900">
                            Eu aceito os{' '}
                            <Link href="/terms" className="text-green-600 hover:text-green-500">
                                Termos de Uso
                            </Link>{' '}
                            e{' '}
                            <Link href="/privacy" className="text-green-600 hover:text-green-500">
                                Política de Privacidade
                            </Link>
                        </label>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {loading ? 'Criando conta...' : 'Criar conta gratuita'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
