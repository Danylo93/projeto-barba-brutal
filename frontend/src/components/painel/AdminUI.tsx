/**
 * Peças visuais do painel do admin do SaaS.
 *
 * Ficam separadas da página porque a página já carrega a busca de dados e as
 * ações; misturar as duas coisas num arquivo só é o que deixava a tela difícil
 * de mexer. Nada aqui tem estado — recebe número e devolve pixel.
 *
 * As regras de leitura vieram do guia de visualização do projeto e valem para
 * qualquer número que apareça aqui:
 *
 * - Número solto (o herói, o valor de um tile) usa os algarismos proporcionais
 *   da fonte. `tabular-nums` só entra em COLUNA de tabela, onde os dígitos
 *   precisam alinhar na vertical; num valor grande ele deixa "121" frouxo.
 * - Barra de comparação é de uma cor só. A cor segue a entidade, nunca o
 *   ranking — pintar o primeiro colocado de outro tom faz o leitor achar que
 *   a cor significa alguma coisa.
 * - Verde, amarelo e vermelho são reservados para ESTADO (ativa, pendente,
 *   suspensa) e nunca viram "série 3" de um gráfico.
 * - Texto não veste a cor do dado: quem carrega identidade é a marca colorida
 *   ao lado, não a letra.
 */

import type { ReactNode } from 'react'

/** Dinheiro em real, sempre com os centavos. */
export function emReais(valor: number): string {
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * O número que a tela lidera.
 *
 * Um por tela — dois heróis é o mesmo que nenhum. Sem `tabular-nums`: aqui o
 * número é grande e proporcional lê melhor.
 */
export function Heroi({
    rotulo,
    prefixo,
    valor,
    apoio,
    className = '',
}: {
    rotulo: string
    /** Símbolo que acompanha o número (ex.: `R$`), em corpo menor. */
    prefixo?: string
    valor: string
    apoio?: ReactNode
    className?: string
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 sm:p-8 ${className}`}
        >
            {/* Brilho de canto: dá profundidade sem competir com o número. */}
            <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-yellow-400/10 blur-3xl"
            />
            {/*
              O card acompanha a altura da coluna de tiles ao lado. Sem
              `justify-between` sobrava um vazio de uns 150px embaixo do
              número, e o card parecia inacabado.
            */}
            <div className="relative flex h-full flex-col justify-between gap-6">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                        {rotulo}
                    </p>
                    <p className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
                        {prefixo && (
                            <span className="text-xl font-black text-zinc-500 sm:text-2xl">{prefixo}</span>
                        )}
                        <span className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
                            {valor}
                        </span>
                    </p>
                </div>
                {apoio && <div className="border-t border-zinc-800/80 pt-4">{apoio}</div>}
            </div>
        </div>
    )
}

/** Número de apoio, para a linha de KPIs. */
export function Tile({
    rotulo,
    valor,
    contexto,
    icone,
    destaque = false,
}: {
    rotulo: string
    valor: string
    contexto?: string
    icone?: ReactNode
    /** Só o número que representa saúde da base ganha o tom de estado. */
    destaque?: boolean
}) {
    return (
        <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700">
            <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{rotulo}</p>
                {icone && (
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 transition-colors ${
                            destaque ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-yellow-400'
                        }`}
                    >
                        {icone}
                    </span>
                )}
            </div>
            <p className="mt-3 text-3xl font-black leading-none tracking-tight text-white">{valor}</p>
            {contexto && <p className="mt-2 text-xs text-zinc-500">{contexto}</p>}
        </div>
    )
}

/** Cabeçalho de bloco: título, contagem e ação opcional à direita. */
export function Secao({
    titulo,
    descricao,
    contagem,
    acao,
    className = '',
    children,
}: {
    titulo: string
    descricao?: string
    contagem?: string
    acao?: ReactNode
    /** Onde a seção cai no grid da página (ex.: `lg:col-span-3`). */
    className?: string
    children: ReactNode
}) {
    return (
        <section
            className={`overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 ${className}`}
        >
            <header className="flex flex-col gap-3 border-b border-zinc-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-black tracking-tight text-white">{titulo}</h2>
                        {contagem && (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[11px] font-bold text-zinc-400 tabular-nums">
                                {contagem}
                            </span>
                        )}
                    </div>
                    {descricao && <p className="mt-1 text-xs text-zinc-500">{descricao}</p>}
                </div>
                {acao}
            </header>
            {children}
        </section>
    )
}

type Estado = 'boa' | 'atencao' | 'ruim' | 'neutra'

const tomDoEstado: Record<Estado, string> = {
    boa: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    atencao: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    ruim: 'border-red-400/25 bg-red-400/10 text-red-300',
    neutra: 'border-zinc-700 bg-zinc-800/60 text-zinc-400',
}

const pontoDoEstado: Record<Estado, string> = {
    boa: 'bg-emerald-400',
    atencao: 'bg-amber-400',
    ruim: 'bg-red-400',
    neutra: 'bg-zinc-500',
}

/**
 * Estado em pílula.
 *
 * Sempre com bolinha E palavra: cor sozinha não conta estado para quem não
 * distingue verde de vermelho.
 */
export function Pilula({ estado, children }: { estado: Estado; children: ReactNode }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${tomDoEstado[estado]}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${pontoDoEstado[estado]}`} />
            {children}
        </span>
    )
}

/** Iniciais da barbearia, para a linha não ser só texto. */
export function Inicial({ nome }: { nome: string }) {
    const letras = nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0] ?? '')
        .join('')
        .toUpperCase()

    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/70 bg-gradient-to-br from-zinc-800 to-zinc-900 text-xs font-black text-zinc-300">
            {letras || '?'}
        </span>
    )
}

/**
 * Comparação de magnitude entre poucos itens.
 *
 * Barra, não rosca: comparar comprimento a partir de uma base comum é a coisa
 * que o olho faz bem. Uma cor só para todas — é uma série só, então legenda
 * seria uma caixinha repetindo o título.
 *
 * A ponta que carrega o dado é arredondada em 4px; a base fica reta, presa ao
 * zero. O trilho é a mesma cor num tom fraco, para o estado ler na barra
 * inteira.
 */
export function BarraComparativa({
    rotulo,
    apoio,
    valor,
    maximo,
    valorEscrito,
}: {
    rotulo: string
    apoio?: string
    valor: number
    maximo: number
    valorEscrito: string
}) {
    // Barra com 0 no numerador ainda mostra um fiapo, para a linha não sumir.
    const proporcao = maximo > 0 ? Math.max(valor / maximo, valor > 0 ? 0.04 : 0) : 0

    return (
        <div className="py-3">
            <div className="flex items-baseline justify-between gap-4">
                <p className="truncate text-sm font-bold text-white">{rotulo}</p>
                <p className="shrink-0 text-sm font-black text-white tabular-nums">{valorEscrito}</p>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-yellow-400/10">
                <div
                    className="h-full rounded-r-[4px] bg-yellow-400 transition-[width] duration-500"
                    style={{ width: `${Math.min(proporcao * 100, 100)}%` }}
                />
            </div>
            {apoio && <p className="mt-2 text-xs text-zinc-500">{apoio}</p>}
        </div>
    )
}

/** Enquanto os números não chegam, o esqueleto do que vai chegar. */
export function Esqueleto({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-zinc-800/60 ${className}`} />
}

/** Linha de tabela quando não há o que mostrar. */
export function Vazio({ children }: { children: ReactNode }) {
    return (
        <div className="px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">{children}</p>
        </div>
    )
}
