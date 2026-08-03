'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, Clock, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '@/components/shared/Logo'
import useUsuario from '@/data/hooks/useUsuario'
import useAPI from '@/data/hooks/useAPI'
import useTrialStatus from '@/hooks/useTrialStatus'

interface LinkNav {
    href: string
    rotulo: string
}

/**
 * Barra de navegação dos painéis internos (dono, barbeiro, cliente, admin).
 *
 * O que fica onde:
 * - `links` são as telas do dia a dia e ficam na horizontal.
 * - `conta` são as telas de administração da própria conta e vivem no menu
 *   do usuário, à direita — assim a linha não estoura mesmo com muitas telas.
 * No mobile os dois grupos aparecem juntos na gaveta.
 */
export default function PainelNav() {
    const { usuario, sair } = useUsuario()
    const { httpGet } = useAPI()
    const pathname = usePathname()
    const [aberto, setAberto] = useState(false)
    const [menuConta, setMenuConta] = useState(false)
    const [barbeariaNome, setBarbeariaNome] = useState<string | undefined>()
    const trial = useTrialStatus()
    const contaRef = useRef<HTMLDivElement>(null)

    const isTenant = usuario?.tipo === 'tenant'
    const isAdmin = usuario?.tipo === 'admin'
    const isBarbeiro = !!usuario?.barbeiro

    // Nome da barbearia (tenant) para exibir na marca — o admin do SaaS mantém a marca do sistema.
    useEffect(() => {
        if (!usuario?.tenantId || isAdmin) {
            setBarbeariaNome(undefined)
            return
        }
        httpGet(`tenants/${usuario.tenantId}`)
            .then((t) => {
                if (t?.nome) setBarbeariaNome(t.nome)
                if (t?.corPrimaria) document.documentElement.style.setProperty('--tenant-primary', t.corPrimaria)
                if (t?.corSecundaria) document.documentElement.style.setProperty('--tenant-secondary', t.corSecundaria)
            })
            .catch(() => {})
    }, [usuario?.tenantId, isAdmin, httpGet])

    useEffect(() => {
        if (!usuario) return
        const marca = barbeariaNome || 'Barbearia Brutal'
        if (isAdmin) {
            document.title = 'Painel | Barbearia Brutal'
        } else if (usuario.tipo === 'tenant') {
            document.title = `Painel | ${marca}`
        } else {
            document.title = `Agendamento | ${marca}`
        }
    }, [usuario, isAdmin, barbeariaNome])

    // Fecha o menu do usuário ao clicar fora ou apertar Esc.
    useEffect(() => {
        if (!menuConta) return
        function clique(e: MouseEvent) {
            if (!contaRef.current?.contains(e.target as Node)) setMenuConta(false)
        }
        function tecla(e: KeyboardEvent) {
            if (e.key === 'Escape') setMenuConta(false)
        }
        document.addEventListener('mousedown', clique)
        document.addEventListener('keydown', tecla)
        return () => {
            document.removeEventListener('mousedown', clique)
            document.removeEventListener('keydown', tecla)
        }
    }, [menuConta])

    // Fecha ao navegar.
    useEffect(() => {
        setMenuConta(false)
        setAberto(false)
    }, [pathname])

    const isEmployeeBarber = isBarbeiro && !isTenant

    let links: LinkNav[] = []
    let conta: LinkNav[] = []
    if (isAdmin) {
        links = [{ href: '/admin', rotulo: 'Painel' }]
    } else if (isTenant) {
        links = [
            { href: '/dashboard', rotulo: 'Dashboard' },
            { href: '/agendamentos', rotulo: 'Agendamentos' },
            { href: '/clientes', rotulo: 'Clientes' },
            { href: '/profissionais', rotulo: 'Profissionais' },
            { href: '/servicos', rotulo: 'Serviços' },
            { href: '/financas', rotulo: 'Financeiro' },
            { href: '/clube', rotulo: 'Clube' },
            { href: '/marketing', rotulo: 'Marketing' },
        ]
        conta = [
            { href: '/assinatura', rotulo: 'Meu Plano' },
            { href: '/configuracoes', rotulo: 'Configurações' },
            { href: '/api-key', rotulo: 'API Key' },
            { href: '/meus-dados', rotulo: 'Meus dados (LGPD)' },
        ]
    } else if (isEmployeeBarber) {
        links = [
            { href: '/agenda', rotulo: 'Minha Agenda' },
            { href: '/meus-precos', rotulo: 'Meus Preços' },
            { href: '/financas', rotulo: 'Finanças' },
        ]
        conta = [{ href: '/meus-dados', rotulo: 'Meus dados (LGPD)' }]
    } else {
        // cliente
        links = [
            { href: '/agendamento', rotulo: 'Agendar' },
            { href: '/agendamentos', rotulo: 'Meus Agendamentos' },
            { href: '/clube', rotulo: 'Clube' },
        ]
        conta = [{ href: '/meus-dados', rotulo: 'Meus dados (LGPD)' }]
    }

    function ativo(href: string) {
        return pathname === href || (href !== '/' && pathname?.startsWith(href + '/'))
    }

    // Com muitos itens a linha só cabe a partir de 1024px; com poucos, 768px basta.
    const muitosLinks = links.length >= 6
    const barraDesktop = muitosLinks ? 'hidden lg:flex' : 'hidden md:flex'
    const soMobile = muitosLinks ? 'lg:hidden' : 'md:hidden'

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

    const nomeExibido = usuario?.nome || usuario?.email || ''
    const inicial = nomeExibido.trim().charAt(0).toUpperCase() || '?'
    const contaAtiva = conta.some((l) => ativo(l.href))

    return (
        <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800/80">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16">
                <div className="flex items-center gap-3 xl:gap-6">
                    <Logo href={logoHref} nome={isAdmin ? undefined : barbeariaNome} compacto={muitosLinks} />
                    <div className={`${barraDesktop} shrink-0 items-center gap-0.5 xl:gap-1`}>
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 xl:px-3 ${
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

                <div className={`${barraDesktop} shrink-0 items-center gap-3`}>
                    {/* Badge de Trial */}
                    {trial.emTeste && !trial.carregando && (
                        <Link
                            href="/planos"
                            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1
                                text-xs font-bold transition-all duration-200 hover:scale-105
                                ${trialBadgeColor[trial.urgencia]}`}
                            title={`${trial.diasRestantes} dias restantes do período de teste`}
                        >
                            <Clock size={12} />
                            {trial.diasRestantes}d trial
                        </Link>
                    )}

                    {/* Menu do usuário: conta + sair */}
                    <div className="relative" ref={contaRef}>
                        <button
                            type="button"
                            onClick={() => setMenuConta((v) => !v)}
                            aria-haspopup="menu"
                            aria-expanded={menuConta}
                            className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 transition-colors ${
                                menuConta || contaAtiva
                                    ? 'border-yellow-400/40 bg-yellow-400/10'
                                    : 'border-zinc-700/80 hover:bg-zinc-800'
                            }`}
                        >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold text-zinc-900">
                                {inicial}
                            </span>
                            <span className="hidden max-w-[130px] truncate text-sm text-zinc-300 2xl:inline">
                                {nomeExibido}
                            </span>
                            <ChevronDown
                                size={15}
                                className={`shrink-0 text-zinc-400 transition-transform ${menuConta ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <AnimatePresence>
                            {menuConta && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                    role="menu"
                                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50"
                                >
                                    <div className="border-b border-zinc-800 px-4 py-3">
                                        <p className="truncate text-sm font-semibold text-white">{nomeExibido}</p>
                                        {usuario?.email && usuario.email !== nomeExibido && (
                                            <p className="truncate text-xs text-zinc-500">{usuario.email}</p>
                                        )}
                                    </div>
                                    {conta.length > 0 && (
                                        <div className="py-1">
                                            {conta.map((l) => (
                                                <Link
                                                    key={l.href}
                                                    href={l.href}
                                                    role="menuitem"
                                                    onClick={() => setMenuConta(false)}
                                                    className={`block px-4 py-2.5 text-sm transition-colors ${
                                                        ativo(l.href)
                                                            ? 'bg-yellow-400/10 text-yellow-400'
                                                            : 'text-zinc-300 hover:bg-zinc-800'
                                                    }`}
                                                >
                                                    {l.rotulo}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        role="menuitem"
                                        onClick={() => {
                                            setMenuConta(false)
                                            sair()
                                        }}
                                        className="flex w-full items-center gap-2 border-t border-zinc-800 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-zinc-800"
                                    >
                                        <LogOut size={16} /> Sair
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <button
                    type="button"
                    aria-label="Abrir menu"
                    aria-expanded={aberto}
                    onClick={() => setAberto((v) => !v)}
                    className={`${soMobile} shrink-0 rounded-lg p-2 text-white transition-colors hover:bg-zinc-800`}
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
                        // 98 não existe na escala de opacidade do Tailwind: a classe era
                        // descartada e a gaveta ficava sem fundo nenhum.
                        className={`${soMobile} border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-xl overflow-hidden`}
                    >
                        <nav className="flex flex-col px-4 py-3 gap-1">
                            {usuario && (
                                <div className="px-3 pb-3 mb-1 border-b border-zinc-800">
                                    <p className="text-white font-semibold text-sm leading-5">{nomeExibido}</p>
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
                            {[...links, ...conta].map((l, i) => (
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
                                transition={{ delay: (links.length + conta.length) * 0.04 }}
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
