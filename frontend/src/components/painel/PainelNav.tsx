'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '@/components/shared/Logo'
import useUsuario from '@/data/hooks/useUsuario'
import useTrialStatus from '@/hooks/useTrialStatus'

interface LinkNav {
    href: string
    rotulo: string
}

/**
 * Barra de navegação dos painéis internos (dono, barbeiro, cliente, admin).
 * Mostra links conforme o papel e destaca a página atual. Fixa no topo,
 * com menu hambúrguer no mobile. Badge de trial para tenants em teste.
 */
export default function PainelNav() {
    const { usuario, sair } = useUsuario()
    const pathname = usePathname()
    const [aberto, setAberto] = useState(false)
    const trial = useTrialStatus()

    useEffect(() => {
        if (usuario) {
            if (usuario.tipo === 'tenant' || usuario.tipo === 'admin') {
                document.title = 'Painel | Barbearia Brutal'
            } else {
                document.title = 'Agendamento | Barbearia'
            }
        }
    }, [usuario])

    const isTenant = usuario?.tipo === 'tenant'
    const isAdmin = usuario?.tipo === 'admin'
    const isBarbeiro = !!usuario?.barbeiro
    const isEmployeeBarber = isBarbeiro && !isTenant

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
            { href: '/configuracoes', rotulo: 'Configurações' },
        ]
    } else if (isEmployeeBarber) {
        links = [
            { href: '/agenda', rotulo: 'Minha Agenda' },
            { href: '/financas', rotulo: 'Finanças' },
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

    // Cor do badge baseada na urgência do trial
    const trialBadgeColor = {
        safe: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        danger: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    }

    let logoHref = '/'
    if (isAdmin) {
        logoHref = '/admin'
    } else if (isTenant) {
        logoHref = '/dashboard'
    } else if (isEmployeeBarber) {
        logoHref = '/agenda'
    } else if (usuario) {
        logoHref = '/agendamento'
    }

    return (
        <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800/80">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                    <Logo href={logoHref} />
                    <div className="hidden md:flex items-center gap-1">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    ativo(l.href)
                                        ? 'bg-yellow-400/10 text-yellow-400 shadow-[inset_0_-2px_0_0_rgba(250,204,21,0.4)]'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                                }`}
                            >
                                {l.rotulo}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3">
                    {/* Badge de Trial */}
                    {trial.emTeste && !trial.carregando && (
                        <Link
                            href="/planos"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold 
                                border transition-all duration-200 hover:scale-105
                                ${trialBadgeColor[trial.urgencia]}`}
                            title={`${trial.diasRestantes} dias restantes do período de teste`}
                        >
                            <Clock size={12} />
                            {trial.diasRestantes}d trial
                        </Link>
                    )}

                    {usuario && (
                        <span className="text-sm text-zinc-400 max-w-[180px] truncate">
                            {usuario.nome || usuario.email}
                        </span>
                    )}
                    <button
                        onClick={sair}
                        className="inline-flex items-center gap-2 text-sm text-zinc-300 border border-zinc-700/80 
                            px-3 py-1.5 rounded-lg hover:bg-zinc-800 hover:border-zinc-600 
                            transition-all duration-200"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>

                <button
                    type="button"
                    aria-label="Abrir menu"
                    aria-expanded={aberto}
                    onClick={() => setAberto((v) => !v)}
                    className="md:hidden p-2 text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    {aberto ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {/* Menu Mobile Animado */}
            <AnimatePresence>
                {aberto && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="md:hidden border-t border-zinc-800 bg-zinc-900/98 backdrop-blur-xl overflow-hidden"
                    >
                        <nav className="flex flex-col px-4 py-3 gap-1">
                            {usuario && (
                                <div className="px-3 pb-3 mb-1 border-b border-zinc-800">
                                    <p className="text-white font-semibold text-sm leading-5">
                                        {usuario.nome || usuario.email}
                                    </p>
                                    <p className="text-xs text-zinc-500">{usuario.email}</p>
                                    {/* Badge de trial no mobile */}
                                    {trial.emTeste && !trial.carregando && (
                                        <Link
                                            href="/planos"
                                            onClick={() => setAberto(false)}
                                            className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold 
                                                border ${trialBadgeColor[trial.urgencia]}`}
                                        >
                                            <Clock size={12} />
                                            {trial.diasRestantes} dias restantes de teste
                                        </Link>
                                    )}
                                </div>
                            )}
                            {links.map((l, i) => (
                                <motion.div
                                    key={l.href}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <Link
                                        href={l.href}
                                        onClick={() => setAberto(false)}
                                        className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            ativo(l.href)
                                                ? 'bg-yellow-400/10 text-yellow-400'
                                                : 'text-zinc-300 hover:bg-zinc-800'
                                        }`}
                                    >
                                        {l.rotulo}
                                    </Link>
                                </motion.div>
                            ))}
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: links.length * 0.04 }}
                                onClick={() => {
                                    setAberto(false)
                                    sair()
                                }}
                                className="flex items-center gap-2 text-left px-3 py-2.5 text-red-400 hover:bg-zinc-800 rounded-lg transition-colors mt-1"
                            >
                                <LogOut size={16} /> Sair
                            </motion.button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}
