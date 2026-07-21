import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
    Scissors,
    Star,
    Clock,
    MapPin,
    Phone,
    CalendarCheck,
    ShieldCheck,
    Sparkles,
    ArrowRight,
} from 'lucide-react'
import {
    imagemDoServico,
    imagemDoProfissional,
    formatarTelefone,
} from '@/lib/agendamento-utils'

export const revalidate = 60

interface ServicoPublico {
    id: number
    nome: string
    descricao?: string
    preco: number
    qtdeSlots: number
    ehCombo: boolean
    imagemURL?: string
}

interface ProfissionalPublico {
    id: number
    nome: string
    descricao?: string
    imagemUrl?: string
    avaliacao?: number
    quantidadeAvaliacoes?: number
}

interface BarbeariaPublica {
    id: number
    nome: string
    endereco?: string
    telefone?: string
    dominio?: string
    logo?: string
    corSecundaria?: string
    configuracoes?: {
        horaAbertura?: string
        horaFechamento?: string
        diasAbertos?: number[]
        // Convenção alternativa usada em parte dos dados/config.
        horarioAbertura?: string
        horarioFechamento?: string
        diasFuncionamento?: number[]
    } | null
    servicos: ServicoPublico[]
    profissionais: ProfissionalPublico[]
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const diferenciais = [
    {
        icone: CalendarCheck,
        titulo: 'Agendamento online 24h',
        texto: 'Escolha profissional, serviço e horário em segundos, sem precisar ligar.',
    },
    {
        icone: ShieldCheck,
        titulo: 'Profissionais especialistas',
        texto: 'Barbeiros avaliados pelos próprios clientes.',
    },
    {
        icone: Sparkles,
        titulo: 'Atendimento no horário',
        texto: 'Seja atendido exatamente no horário que você marcar.',
    },
]

function backendBase() {
    return (
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_URL_BASE ||
        'https://barba-brutal-api.onrender.com'
    )
}

async function getBarbearia(dominio: string): Promise<BarbeariaPublica | null> {
    try {
        const res = await fetch(
            `${backendBase()}/tenants/publico/${encodeURIComponent(dominio)}`,
            { next: { revalidate: 60 } }
        )
        if (!res.ok) return null
        const data = await res.json()
        if (!data || !data.id) return null
        return data
    } catch {
        return null
    }
}

function duracaoTexto(qtdeSlots: number): string {
    const min = Math.max(1, qtdeSlots ?? 1) * 30
    const h = Math.floor(min / 60)
    const m = min % 60
    if (h === 0) return `${m} min`
    return m === 0 ? `${h}h` : `${h}h${m}min`
}

export async function generateMetadata({
    params,
}: {
    params: { dominio: string }
}): Promise<Metadata> {
    const b = await getBarbearia(params.dominio)
    if (!b) return { title: 'Barbearia não encontrada' }
    return {
        title: `${b.nome} — Corte, Barba e Estilo`,
        description: `Agende seu horário na ${b.nome}. Profissionais especialistas, agendamento online.`,
        openGraph: {
            title: `${b.nome} — Corte, Barba e Estilo`,
            description: `Agende seu horário na ${b.nome}.`,
            type: 'website',
        },
    }
}

export default async function BarbeariaPublicaPage({
    params,
}: {
    params: { dominio: string }
}) {
    const b = await getBarbearia(params.dominio)
    if (!b) notFound()

    // Leva o cliente ao login/cadastro já vinculado a esta barbearia (tenant),
    // e daí para o fluxo de agendamento dela.
    const agendarHref = `/entrar?tenant=${b.id}&destino=${encodeURIComponent('/agendamento')}`
    const cfg = b.configuracoes
    const abertura = cfg?.horaAbertura ?? cfg?.horarioAbertura ?? '08:00'
    const fechamento = cfg?.horaFechamento ?? cfg?.horarioFechamento ?? '21:00'
    const dias = (cfg?.diasAbertos ?? cfg?.diasFuncionamento ?? [1, 2, 3, 4, 5, 6]).map(
        (d) => DIAS[d]
    )
    const [nomePrimario, ...resto] = b.nome.split(' ')
    const nomeSecundario = resto.join(' ')

    // Cor de destaque da barbearia (tenant). Validada para evitar valores estranhos;
    // fallback para o amarelo padrão do sistema.
    const brand =
        b.corSecundaria && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(b.corSecundaria)
            ? b.corSecundaria
            : '#facc15'

    const Marca = () => (
        <Link href={agendarHref} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-zinc-900">
                <Scissors size={18} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black tracking-tight text-white">
                {nomePrimario}{' '}
                {nomeSecundario && <span className="text-[var(--brand)]">{nomeSecundario}</span>}
            </span>
        </Link>
    )

    return (
        <div
            className="min-h-screen scroll-smooth bg-zinc-950 text-zinc-100"
            style={{ ['--brand' as any]: brand }}
        >
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Marca />
                    <nav className="hidden items-center gap-8 md:flex">
                        <a href="#servicos" className="text-sm text-zinc-300 transition-colors hover:text-white">
                            Serviços
                        </a>
                        {b.profissionais.length > 0 && (
                            <a href="#equipe" className="text-sm text-zinc-300 transition-colors hover:text-white">
                                Equipe
                            </a>
                        )}
                        <a href="#contato" className="text-sm text-zinc-300 transition-colors hover:text-white">
                            Contato
                        </a>
                    </nav>
                    <Link
                        href={agendarHref}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-zinc-900 transition-all hover:opacity-90 active:scale-95"
                    >
                        Agendar
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0">
                    <Image
                        src="/banners/principal.webp"
                        alt={b.nome}
                        fill
                        priority
                        className="object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/85 to-zinc-950" />
                </div>

                <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 text-center">
                    <div className="animate-fade-in mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5">
                        <Scissors size={14} className="text-[var(--brand)]" />
                        <span className="text-sm font-medium text-[var(--brand)]">{b.nome}</span>
                    </div>

                    <h1 className="animate-slide-up text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
                        Seu estilo,{' '}
                        <span className="text-[var(--brand)]">
                            no capricho.
                        </span>
                    </h1>
                    <p className="animate-slide-up mx-auto mt-6 max-w-xl text-lg text-zinc-300">
                        Agende online e seja atendido exatamente no horário marcado por
                        profissionais especialistas.
                    </p>

                    <div className="animate-slide-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={agendarHref}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3.5 font-bold text-zinc-900 shadow-lg shadow-black/30 transition-all hover:opacity-90 active:scale-95 sm:w-auto"
                        >
                            Agendar horário
                            <ArrowRight size={18} />
                        </Link>
                        <a
                            href="#servicos"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 py-3.5 font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900 sm:w-auto"
                        >
                            Ver serviços e preços
                        </a>
                    </div>
                </div>
            </section>

            {/* Serviços */}
            <section id="servicos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <div className="mb-12 text-center reveal-up">
                    <span className="text-sm font-semibold uppercase tracking-wider text-[var(--brand)]">
                        Serviços
                    </span>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                        Escolha seu serviço
                    </h2>
                    <p className="mt-3 text-zinc-400">Preços justos, resultado brutal.</p>
                </div>

                {b.servicos.length === 0 ? (
                    <p className="text-center text-zinc-500">
                        Os serviços desta barbearia serão exibidos em breve.
                    </p>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {b.servicos.map((servico) => (
                            <div
                                key={servico.id}
                                className={`reveal-up group flex flex-col overflow-hidden rounded-2xl border bg-zinc-900/60 transition-all hover:-translate-y-1 ${
                                    servico.ehCombo
                                        ? 'border-yellow-400/60 shadow-lg shadow-yellow-400/10'
                                        : 'border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <div className="relative h-44 overflow-hidden">
                                    <Image
                                        src={imagemDoServico(servico.nome, servico.imagemURL)}
                                        alt={servico.nome}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {servico.ehCombo && (
                                        <span className="absolute left-3 top-3 rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-bold uppercase text-zinc-900">
                                            Combo
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-lg font-bold text-white">{servico.nome}</h3>
                                        <span className="whitespace-nowrap text-lg font-black text-[var(--brand)]">
                                            R$ {servico.preco.toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                    {servico.descricao && (
                                        <p className="mt-2 flex-1 text-sm text-zinc-400">
                                            {servico.descricao}
                                        </p>
                                    )}
                                    <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                                        <Clock size={14} />
                                        <span>{duracaoTexto(servico.qtdeSlots)}</span>
                                    </div>
                                    <Link
                                        href={agendarHref}
                                        className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                                            servico.ehCombo
                                                ? 'bg-[var(--brand)] text-zinc-900 hover:opacity-90'
                                                : 'border border-zinc-700 text-zinc-100 hover:bg-zinc-800'
                                        }`}
                                    >
                                        Agendar
                                        <ArrowRight size={15} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Diferenciais */}
            <section className="border-y border-zinc-800/80 bg-zinc-900/30">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6">
                    {diferenciais.map((item) => (
                        <div key={item.titulo} className="text-center sm:text-left reveal-up">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/80 text-[var(--brand)] sm:mx-0">
                                <item.icone size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-white">{item.titulo}</h3>
                            <p className="mt-1.5 text-sm text-zinc-400">{item.texto}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Equipe */}
            {b.profissionais.length > 0 && (
                <section id="equipe" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                    <div className="mb-12 text-center reveal-up">
                        <span className="text-sm font-semibold uppercase tracking-wider text-[var(--brand)]">
                            Equipe
                        </span>
                        <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                            Nossos profissionais
                        </h2>
                        <p className="mt-3 text-zinc-400">Mãos de mestre para o seu visual.</p>
                    </div>

                    <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
                        {b.profissionais.map((prof) => (
                            <div
                                key={prof.id}
                                className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700 reveal-up"
                            >
                                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
                                    <Image
                                        src={imagemDoProfissional(prof.id, prof.imagemUrl)}
                                        alt={prof.nome}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-white">{prof.nome}</h3>
                                    {prof.descricao && (
                                        <p className="text-sm text-zinc-400">{prof.descricao}</p>
                                    )}
                                    {typeof prof.avaliacao === 'number' && prof.avaliacao > 0 && (
                                        <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                                            <Star size={15} className="fill-[var(--brand)] text-[var(--brand)]" />
                                            <span className="font-semibold text-white">
                                                {prof.avaliacao.toFixed(1)}
                                            </span>
                                            {prof.quantidadeAvaliacoes ? (
                                                <span className="text-zinc-500">
                                                    ({prof.quantidadeAvaliacoes})
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Contato / Horário / Localização */}
            <section id="contato" className="border-t border-zinc-800/80 bg-zinc-900/30">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3">
                    <div>
                        <div className="mb-4 flex items-center gap-2 text-[var(--brand)]">
                            <Clock size={20} />
                            <h3 className="text-lg font-bold text-white">Horário</h3>
                        </div>
                        <p className="text-sm text-zinc-300">
                            {abertura} — {fechamento}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">{dias.join(' · ')}</p>
                    </div>

                    {b.endereco && (
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-[var(--brand)]">
                                <MapPin size={20} />
                                <h3 className="text-lg font-bold text-white">Onde estamos</h3>
                            </div>
                            <p className="text-sm text-zinc-300">{b.endereco}</p>
                        </div>
                    )}

                    {b.telefone && (
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-[var(--brand)]">
                                <Phone size={20} />
                                <h3 className="text-lg font-bold text-white">Fale com a gente</h3>
                            </div>
                            <a
                                href={`tel:+55${b.telefone.replace(/\D/g, '')}`}
                                className="block text-sm text-zinc-300 transition-colors hover:text-white"
                            >
                                {formatarTelefone(b.telefone)}
                            </a>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA final */}
            <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-zinc-900 to-zinc-950 px-6 py-14 text-center reveal-up">
                    <div className="absolute -inset-10 bg-yellow-400/5 blur-3xl" aria-hidden />
                    <div className="relative">
                        <h2 className="text-3xl font-black text-white sm:text-4xl">
                            Pronto para o próximo corte?
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg text-zinc-300">
                            Garanta seu horário na {b.nome} em poucos cliques. Sem fila, sem espera.
                        </p>
                        <Link
                            href={agendarHref}
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-8 py-4 font-bold text-zinc-900 shadow-lg shadow-black/30 transition-all hover:opacity-90 active:scale-95"
                        >
                            Agendar meu horário
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800/80">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
                    <Marca />
                    <p className="text-sm text-zinc-500">
                        © {new Date().getFullYear()} {b.nome}. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    )
}
