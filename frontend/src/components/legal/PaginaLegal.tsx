import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Moldura das páginas legais. Usa o tema escuro do produto: documento jurídico
 * exibido num layout diferente do resto do site passa impressão de página
 * genérica colada de fora — e no caso da privacidade era exatamente isso.
 */
export default function PaginaLegal({
    titulo,
    atualizadoEm,
    versao,
    resumo,
    children,
}: {
    titulo: string
    atualizadoEm: string
    versao: string
    resumo?: string
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-zinc-900">
            <header className="border-b border-zinc-800 bg-zinc-900/95">
                <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-yellow-400"
                    >
                        <ArrowLeft size={16} /> Voltar ao início
                    </Link>
                    <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{titulo}</h1>
                    <p className="mt-2 text-sm text-zinc-500">
                        Versão {versao} · em vigor desde {atualizadoEm}
                    </p>
                    {resumo && (
                        <p className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm leading-relaxed text-zinc-300">
                            {resumo}
                        </p>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
                <article className="flex flex-col gap-8">{children}</article>
            </main>
        </div>
    )
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="mb-3 text-xl font-bold text-white">{titulo}</h2>
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-400">{children}</div>
        </section>
    )
}

export function Lista({ itens }: { itens: React.ReactNode[] }) {
    return (
        <ul className="flex flex-col gap-2">
            {itens.map((item, i) => (
                <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                    <span className="min-w-0">{item}</span>
                </li>
            ))}
        </ul>
    )
}

/** Dados que só você pode preencher — deixar placeholder é melhor que inventar. */
export function AvisoPreenchimento() {
    return (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-300/90">
            Os campos marcados como <strong>[preencher]</strong> dependem dos dados reais da
            empresa (razão social, CNPJ, endereço e contato do encarregado). Preencha antes de
            colocar o produto no ar: documento legal com dado inventado não protege ninguém.
        </p>
    )
}
