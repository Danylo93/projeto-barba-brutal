'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DemoPage() {
    const [activeTab, setActiveTab] = useState('agendamentos')

    const tabs = [
        { id: 'agendamentos', label: 'Agendamentos', icon: '📅' },
        { id: 'clientes', label: 'Clientes', icon: '👥' },
        { id: 'profissionais', label: 'Profissionais', icon: '💇' },
        { id: 'servicos', label: 'Serviços', icon: '✂️' },
        { id: 'relatorios', label: 'Relatórios', icon: '📊' },
    ]

    const demoData = {
        agendamentos: [
            { id: 1, cliente: 'João Silva', servico: 'Corte + Barba', horario: '14:00', status: 'Confirmado' },
            { id: 2, cliente: 'Maria Santos', servico: 'Corte Feminino', horario: '15:30', status: 'Agendado' },
            { id: 3, cliente: 'Pedro Oliveira', servico: 'Barba', horario: '16:00', status: 'Confirmado' },
        ],
        clientes: [
            { id: 1, nome: 'João Silva', telefone: '(11) 99999-9999', ultimaVisita: '15/01/2024', totalVisitas: 12 },
            { id: 2, nome: 'Maria Santos', telefone: '(11) 88888-8888', ultimaVisita: '10/01/2024', totalVisitas: 8 },
            { id: 3, nome: 'Pedro Oliveira', telefone: '(11) 77777-7777', ultimaVisita: '20/01/2024', totalVisitas: 15 },
        ],
        profissionais: [
            { id: 1, nome: 'Carlos Barbeiro', especialidade: 'Corte + Barba', avaliacao: 4.9, clientes: 156 },
            { id: 2, nome: 'Ana Cabeleireira', especialidade: 'Corte Feminino', avaliacao: 4.8, clientes: 89 },
        ],
        servicos: [
            { id: 1, nome: 'Corte + Barba', preco: 'R$ 45,00', duracao: '45 min', ativo: true },
            { id: 2, nome: 'Corte Masculino', preco: 'R$ 25,00', duracao: '30 min', ativo: true },
            { id: 3, nome: 'Barba', preco: 'R$ 20,00', duracao: '20 min', ativo: true },
        ],
        relatorios: [
            { periodo: 'Janeiro 2024', agendamentos: 245, receita: 'R$ 8.450,00', clientesNovos: 23 },
            { periodo: 'Dezembro 2023', agendamentos: 198, receita: 'R$ 6.890,00', clientesNovos: 18 },
        ],
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Demonstração do Sistema</h1>
                            <p className="text-gray-600">Veja como funciona nossa plataforma</p>
                        </div>
                        <Link
                            href="/register"
                            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Começar Grátis
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white shadow rounded-lg">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8 px-6">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === tab.id
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'agendamentos' && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Agendamentos de Hoje</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Cliente
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Serviço
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Horário
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {demoData.agendamentos.map((agendamento) => (
                                                    <tr key={agendamento.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {agendamento.cliente}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {agendamento.servico}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {agendamento.horario}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                agendamento.status === 'Confirmado' 
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {agendamento.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'clientes' && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Base de Clientes</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Nome
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Telefone
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Última Visita
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Total de Visitas
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {demoData.clientes.map((cliente) => (
                                                    <tr key={cliente.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {cliente.nome}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {cliente.telefone}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {cliente.ultimaVisita}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {cliente.totalVisitas}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profissionais' && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Nossa Equipe</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {demoData.profissionais.map((profissional) => (
                                            <div key={profissional.id} className="bg-gray-50 p-6 rounded-lg">
                                                <h4 className="text-lg font-medium text-gray-900 mb-2">
                                                    {profissional.nome}
                                                </h4>
                                                <p className="text-gray-600 mb-2">{profissional.especialidade}</p>
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center">
                                                        <span className="text-yellow-400">⭐</span>
                                                        <span className="ml-1 text-sm text-gray-600">
                                                            {profissional.avaliacao}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {profissional.clientes} clientes
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'servicos' && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Serviços Oferecidos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {demoData.servicos.map((servico) => (
                                            <div key={servico.id} className="bg-gray-50 p-6 rounded-lg">
                                                <h4 className="text-lg font-medium text-gray-900 mb-2">
                                                    {servico.nome}
                                                </h4>
                                                <p className="text-2xl font-bold text-green-600 mb-2">
                                                    {servico.preco}
                                                </p>
                                                <p className="text-gray-600 mb-4">{servico.duracao}</p>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    servico.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {servico.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'relatorios' && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Relatórios de Performance</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {demoData.relatorios.map((relatorio, index) => (
                                            <div key={index} className="bg-gray-50 p-6 rounded-lg">
                                                <h4 className="text-lg font-medium text-gray-900 mb-4">
                                                    {relatorio.periodo}
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Agendamentos:</span>
                                                        <span className="font-medium">{relatorio.agendamentos}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Receita:</span>
                                                        <span className="font-medium text-green-600">{relatorio.receita}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Novos Clientes:</span>
                                                        <span className="font-medium">{relatorio.clientesNovos}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            Pronto para transformar sua barbearia?
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Comece seu teste gratuito de 14 dias agora mesmo!
                        </p>
                        <Link
                            href="/register"
                            className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 transition-colors text-lg font-medium"
                        >
                            Começar Teste Grátis
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}