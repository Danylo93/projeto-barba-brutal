'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import useUsuario from '@/data/hooks/useUsuario'

interface LinkNav {
    href: string
    rotulo: string
}

/**
 * Barra de navegação dos painéis internos (dono, barbeiro, cliente, admin).
 * Mostra links conforme o papel e destaca a página atual. Fixa no topo,
 * com menu hambúrguer no mobile.
 */
export default function PainelNav() {
    const { usuario, sair } = useUsuario()
    const pathname = usePathname()
    const [aberto, setAberto] = useState(false)

    const isTenant = usuario?.tipo === 'tenant'
    const isAdmin = usuario?.tipo === 'admin'
    const isBarbeiro = !!usuario?.barbeiro

    let links: LinkNav[] = []
    if (isAdmin) {
        links = [{ href: '/admin', rotulo: 'Painel' }]
    } else if (isTenant) {
        links = [
            { href: '/dashboard', rotulo: 'Dashboard' },
            { href: '/agendamentos', rotulo: 'Agendamentos' },
            { href: '/clientes', rotulo: 'Clientes' },
            { href: '/profissionais', rotulo: 'Profissionais' },
            { href: '/servicos', rotulo: 'Serviços' },
            { href: '/assinatura', rotulo: 'Meu Plano' },
        ]
    } else if (isBarbeiro) {
        links = [
            { href: '/agenda', rotulo: 'Minha Agenda' },
            { href: '/agendamento', rotulo: 'Agendar' },
            { href: '/agendamentos', rotulo: 'Agendamentos' },
        ]
    } else {
        // cliente
        links = [
            { href: '/agendamento', rotulo: 'Agendar' },
            { href: '/agendamentos', rotulo: 'Meus Agendamentos' },
        ]
    }

    function ativo(href: string) {
        return pathname === href || (href !== '/' && pathname?.startsWith(href + '/'))
    }

    return (
        <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                    <Logo />
                    <div className="hidden md:flex items-center gap-1">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    ativo(l.href)
                                        ? 'bg-yellow-400/10 text-yellow-400'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                {l.rotulo}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    {usuario && (
                        <span className="text-sm text-zinc-400 max-w-[180px] truncate">
                            {usuario.nome || usuario.email}
                        </span>
                    )}
                    <button
                        onClick={sair}
                        className="inline-flex items-center gap-2 text-sm text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>

                <button
                    type="button"
                    aria-label="Abrir menu"
                    aria-expanded={aberto}
                    onClick={() => setAberto((v) => !v)}
                    className="md:hidden p-2 text-white"
                >
                    {aberto ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {aberto && (
                <div className="md:hidden border-t border-zinc-800 bg-zinc-900">
                    <nav className="flex flex-col px-4 py-3 gap-1">
                        {usuario && (
                            <div className="px-3 pb-3 mb-1 border-b border-zinc-800">
                                <p className="text-white font-semibold text-sm leading-5">
                                    {usuario.nome || usuario.email}
                                </p>
                                <p className="text-xs text-zinc-500">{usuario.email}</p>
                            </div>
                        )}
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setAberto(false)}
                                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    ativo(l.href)
                                        ? 'bg-yellow-400/10 text-yellow-400'
                                        : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                                {l.rotulo}
                            </Link>
                        ))}
                        <button
                            onClick={() => {
                                setAberto(false)
                                sair()
                            }}
                            className="flex items-center gap-2 text-left px-3 py-2.5 text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </nav>
                </div>
            )}
        </header>
    )
}
