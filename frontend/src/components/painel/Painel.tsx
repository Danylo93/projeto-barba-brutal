import Link from 'next/link'

/**
 * Kit de UI dos painéis internos (dono e admin), no mesmo visual escuro
 * das telas do cliente: fundo zinc-950, cards zinc-900 e acento amarelo.
 */

export function PainelShell({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-200">{children}</div>
}

export function PainelHeader({
    titulo,
    descricao,
    acao,
}: {
    titulo: string
    descricao?: string
    acao?: React.ReactNode
}) {
    return (
        <header className="border-b border-zinc-800 bg-zinc-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">{titulo}</h1>
                        {descricao && <p className="text-zinc-400 mt-1 text-sm">{descricao}</p>}
                    </div>
                    {acao && <div className="flex items-center gap-3">{acao}</div>}
                </div>
            </div>
        </header>
    )
}

export function PainelMain({ children }: { children: React.ReactNode }) {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    )
}

export function Card({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`bg-zinc-900 border border-zinc-800 rounded-xl ${className}`}>
            {children}
        </div>
    )
}

export function StatCard({
    rotulo,
    valor,
    icone,
    cor = 'text-yellow-400',
}: {
    rotulo: string
    valor: React.ReactNode
    icone?: React.ReactNode
    cor?: string
}) {
    return (
        <Card className="p-5">
            <div className="flex items-center gap-4">
                {icone && (
                    <div className={`flex-shrink-0 w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center ${cor}`}>
                        {icone}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide truncate">
                        {rotulo}
                    </p>
                    <p className="text-2xl font-bold text-white mt-0.5">{valor}</p>
                </div>
            </div>
        </Card>
    )
}

export function BotaoPrimario({
    children,
    href,
    onClick,
    type = 'button',
    className = '',
}: {
    children: React.ReactNode
    href?: string
    onClick?: () => void
    type?: 'button' | 'submit'
    className?: string
}) {
    const classes = `inline-flex items-center justify-center gap-2 bg-yellow-400 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors ${className}`
    if (href) {
        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        )
    }
    return (
        <button type={type} onClick={onClick} className={classes}>
            {children}
        </button>
    )
}
