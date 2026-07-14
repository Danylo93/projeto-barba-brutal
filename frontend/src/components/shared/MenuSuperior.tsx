'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import MenuUsuario from './MenuUsuario'
import useUsuario from '@/data/hooks/useUsuario'

interface LinkNav {
    href: string
    rotulo: string
}

export default function MenuSuperior() {
    const { usuario, sair } = useUsuario()
    const [aberto, setAberto] = useState(false)

    const isTenant = usuario?.tipo === 'tenant'
    const isBarbeiro = !!usuario?.barbeiro || isTenant

    // Navegação depende do papel do usuário logado.
    const linksLogado: LinkNav[] = []
    if (usuario) {
        linksLogado.push({ href: '/agendamento', rotulo: 'Agendar' })
        linksLogado.push({ href: '/agendamentos', rotulo: 'Agendamentos' })
        if (isBarbeiro) linksLogado.push({ href: '/agenda', rotulo: 'Minha Agenda' })
        if (isTenant) {
            linksLogado.push({ href: '/servicos', rotulo: 'Serviços' })
            linksLogado.push({ href: '/profissionais', rotulo: 'Profissionais' })
            linksLogado.push({ href: '/clientes', rotulo: 'Clientes' })
            linksLogado.push({ href: '/assinatura', rotulo: 'Meu Plano' })
        }
    }

    const linksPublicos: LinkNav[] = [
        { href: '/#features', rotulo: 'Recursos' },
        { href: '/#pricing', rotulo: 'Preços' },
        { href: '/#testimonials', rotulo: 'Depoimentos' },
    ]

    const links = usuario ? linksLogado : linksPublicos

    return (
        <header className="self-stretch flex justify-center items-center h-20 md:h-24 bg-black/60">
            <nav className="flex items-center justify-between container px-4">
                <Logo />

                {/* Navegação desktop */}
                <div className="hidden md:flex items-center space-x-6">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="text-white hover:text-gray-300 transition-colors whitespace-nowrap"
                        >
                            {l.rotulo}
                        </Link>
                    ))}
                    {usuario ? (
                        <MenuUsuario usuario={usuario} />
                    ) : (
                        <div className="flex items-center space-x-4">
                            <Link href="/login" className="text-white hover:text-gray-300 transition-colors">
                                Entrar
                            </Link>
                            <Link
                                href="/register"
                                className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                            >
                                Começar Grátis
                            </Link>
                        </div>
                    )}
                </div>

                {/* Botão hambúrguer mobile */}
                <button
                    type="button"
                    aria-label="Abrir menu"
                    aria-expanded={aberto}
                    onClick={() => setAberto((v) => !v)}
                    className="md:hidden p-2 text-white"
                >
                    {aberto ? <X size={26} /> : <Menu size={26} />}
                </button>
            </nav>

            {/* Painel mobile */}
            {aberto && (
                <div className="md:hidden fixed inset-x-0 top-20 z-50 bg-black/95 border-t border-white/10 shadow-xl">
                    <nav className="flex flex-col px-6 py-4 gap-1">
                        {usuario && (
                            <div className="flex items-center gap-3 pb-3 mb-2 border-b border-white/10">
                                <div className="flex flex-col">
                                    <span className="text-white font-bold leading-5">{usuario.nome}</span>
                                    <span className="text-xs text-zinc-400">{usuario.email}</span>
                                </div>
                            </div>
                        )}
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setAberto(false)}
                                className="text-white py-3 border-b border-white/5 hover:text-gray-300 transition-colors"
                            >
                                {l.rotulo}
                            </Link>
                        ))}
                        {usuario ? (
                            <button
                                onClick={() => {
                                    setAberto(false)
                                    sair()
                                }}
                                className="text-left text-red-400 py-3 hover:text-red-300 transition-colors"
                            >
                                Sair
                            </button>
                        ) : (
                            <div className="flex flex-col gap-2 pt-4">
                                <Link
                                    href="/login"
                                    onClick={() => setAberto(false)}
                                    className="text-center text-white border border-white/30 px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
                                >
                                    Entrar
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setAberto(false)}
                                    className="text-center bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Começar Grátis
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}
