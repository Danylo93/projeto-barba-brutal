'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        assunto: '',
        mensagem: ''
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                setSuccess(true)
                setFormData({
                    nome: '',
                    email: '',
                    telefone: '',
                    assunto: '',
                    mensagem: ''
                })
            }
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mensagem Enviada!</h2>
                        <p className="text-gray-600 mb-6">
                            Obrigado por entrar em contato. Retornaremos em breve!
                        </p>
                        <Link
                            href="/"
                            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Entre em Contato</h1>
                            <p className="text-gray-600">Estamos aqui para ajudá-lo</p>
                        </div>
                        <Link
                            href="/"
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Envie sua Mensagem</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        id="nome"
                                        name="nome"
                                        required
                                        value={formData.nome}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                                        Telefone
                                    </label>
                                    <input
                                        type="tel"
                                        id="telefone"
                                        name="telefone"
                                        value={formData.telefone}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="assunto" className="block text-sm font-medium text-gray-700 mb-2">
                                        Assunto
                                    </label>
                                    <select
                                        id="assunto"
                                        name="assunto"
                                        required
                                        value={formData.assunto}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    >
                                        <option value="">Selecione um assunto</option>
                                        <option value="suporte">Suporte Técnico</option>
                                        <option value="vendas">Informações sobre Vendas</option>
                                        <option value="demo">Solicitar Demonstração</option>
                                        <option value="billing">Cobrança e Pagamentos</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700 mb-2">
                                        Mensagem
                                    </label>
                                    <textarea
                                        id="mensagem"
                                        name="mensagem"
                                        rows={6}
                                        required
                                        value={formData.mensagem}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                    {loading ? 'Enviando...' : 'Enviar Mensagem'}
                                </button>
                            </form>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Informações de Contato</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">Email</p>
                                            <p className="text-sm text-gray-600">suporte@barbabrutal.com</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">Telefone</p>
                                            <p className="text-sm text-gray-600">(11) 99999-9999</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">Horário de Atendimento</p>
                                            <p className="text-sm text-gray-600">Segunda a Sexta: 9h às 18h</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Suporte Rápido</h3>
                                <div className="space-y-3">
                                    <Link
                                        href="/help"
                                        className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                        Central de Ajuda
                                    </Link>
                                    <Link
                                        href="/demo"
                                        className="block w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                                    >
                                        Agendar Demonstração
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="block w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
                                    >
                                        Começar Teste Grátis
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
