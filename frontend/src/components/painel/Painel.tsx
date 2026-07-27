import Link from 'next/link'

/**
 * Kit de UI dos painéis internos (dono e admin), no mesmo visual escuro
 * das telas do cliente: fundo zinc-950, cards zinc-900 e acento amarelo.
 * Com glassmorphism premium e micro-animações.
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
        <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-6 sm:py-8">
                    <div className="animate-fade-in">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                            {titulo}
                        </h1>
                        {descricao && (
                            <p className="text-zinc-400 mt-1.5 text-sm sm:text-base">
                                {descricao}
                            </p>
                        )}
                    </div>
                    {acao && (
                        <div className="flex items-center gap-3 animate-fade-in">
                            {acao}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export function PainelMain({ children }: { children: React.ReactNode }) {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 animate-slide-up">
            {children}
        </main>
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
        <div
            className={`bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl 
            shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] 
            transition-all duration-300 ${className}`}
        >
            {children}
        </div>
    )
}

export function StatCard({
    rotulo,
    valor,
    icone,
    cor = 'text-yellow-400',
    variacao = null,
}: {
    rotulo: string
    valor: React.ReactNode
    icone?: React.ReactNode
    cor?: string
    /** Variação percentual vs. período anterior (ex.: +12.5). `null` esconde. */
    variacao?: number | null
}) {
    return (
        <Card className="p-5 sm:p-6 group hover:border-zinc-700/80 hover:bg-zinc-800/50 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
                {icone && (
                    <div
                        className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-800/80 
                        border border-zinc-700/50 flex items-center justify-center ${cor}
                        group-hover:scale-105 group-hover:border-zinc-600/50 transition-all duration-300`}
                    >
                        {icone}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
                        {rotulo}
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight tabular-nums">
                        {valor}
                    </p>
                    {typeof variacao === 'number' && Number.isFinite(variacao) && (
                        <p
                            className={`mt-1 text-xs font-semibold ${
                                variacao >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                        >
                            {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}%
                            <span className="ml-1 font-normal text-zinc-500">vs. mês anterior</span>
                        </p>
                    )}
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
    const classes = `inline-flex items-center justify-center gap-2 bg-yellow-400 text-zinc-900 
        font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 
        active:scale-[0.98] transition-all duration-200 
        shadow-[0_0_20px_rgba(250,204,21,0.15)]
        hover:shadow-[0_0_30px_rgba(250,204,21,0.25)] ${className}`
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

/**
 * Indicador compacto de gestão (ticket médio, taxa de cancelamento, etc.).
 * Pensado para caber 2 por linha no mobile e 4 no desktop.
 */
export function MiniCard({
    rotulo,
    valor,
    alerta = false,
    pequeno = false,
}: {
    rotulo: string
    valor: string
    /** Destaca em vermelho quando o número é ruim (ex.: cancelamento alto). */
    alerta?: boolean
    /** Para valores textuais longos (ex.: nome de serviço). */
    pequeno?: boolean
}) {
    return (
        <Card className="p-4">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate">
                {rotulo}
            </p>
            <p
                className={`mt-1 font-black tracking-tight tabular-nums ${
                    pequeno ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'
                } ${alerta ? 'text-red-400' : 'text-white'}`}
                title={valor}
            >
                <span className={pequeno ? 'line-clamp-2' : 'truncate block'}>{valor}</span>
            </p>
        </Card>
    )
}
