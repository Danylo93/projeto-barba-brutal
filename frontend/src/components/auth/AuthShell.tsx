import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/components/shared/Logo'

export interface AuthShellProps {
    children: React.ReactNode
    /** Nome da barbearia (quando o cliente chega por uma barbearia específica). */
    nome?: string | null
}

/**
 * Layout compartilhado das telas de autenticação (login e cadastro).
 * Split-screen: painel de marca à esquerda (desktop) e formulário à direita,
 * seguindo a identidade dark do Barbearia Brutal.
 */
export default function AuthShell({ children, nome }: AuthShellProps) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-950">
            {/* Painel de marca (só desktop) */}
            <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
                <Image
                    src="/banners/principal.webp"
                    alt="Barbearia"
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

                <div className="relative z-10">
                    <Logo nome={nome} />
                </div>

                <div className="relative z-10 flex flex-col gap-4 max-w-md">
                    <h2 className="text-3xl font-black text-white leading-tight">
                        Sua barbearia em um{' '}
                        <span className="text-yellow-400">negócio digital</span>
                    </h2>
                    <ul className="flex flex-col gap-2 text-zinc-300 text-sm">
                        <li className="flex items-center gap-2">
                            <span className="text-yellow-400">✂</span> Agendamentos online 24h
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-yellow-400">✂</span> Gestão de clientes, equipe e serviços
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-yellow-400">✂</span> Relatórios e controle do seu plano
                        </li>
                    </ul>
                </div>
            </div>

            {/* Painel do formulário */}
            <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
                <div className="w-full max-w-sm flex flex-col gap-6 animate-slide-up">
                    <div className="flex justify-center lg:hidden">
                        <Logo nome={nome} />
                    </div>
                    {children}
                    <p className="text-center text-xs text-zinc-500">
                        <Link href="/" className="hover:text-zinc-300 transition-colors">
                            ← Voltar para o site
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
