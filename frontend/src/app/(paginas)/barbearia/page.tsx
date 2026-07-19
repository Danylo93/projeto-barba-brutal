import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
    Scissors,
    Star,
    Clock,
    MapPin,
    Phone,
    Instagram,
    CalendarCheck,
    ShieldCheck,
    Sparkles,
    ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'Barbearia Brutal — Corte, Barba e Estilo',
    description:
        'A barbearia mais brutal da cidade. Corte, barba e combo completo com profissionais especialistas. Agende seu horário online.',
    keywords: ['barbearia', 'corte de cabelo', 'barba', 'barbearia brutal', 'agendamento'],
    openGraph: {
        title: 'Barbearia Brutal — Corte, Barba e Estilo',
        description: 'Agende seu horário na barbearia mais brutal da cidade.',
        type: 'website',
    },
}

const AGENDAR_HREF = '/entrar'

const servicos = [
    {
        nome: 'Corte de Cabelo',
        descricao: 'Corte moderno e estiloso, do clássico ao degradê.',
        preco: 25,
        duracao: '30 min',
        imagem: '/servicos/corte-de-cabelo.jpg',
        destaque: false,
    },
    {
        nome: 'Corte de Barba',
        descricao: 'Barba bem feita, alinhada e finalizada com toalha quente.',
        preco: 20,
        duracao: '30 min',
        imagem: '/servicos/corte-de-barba.jpg',
        destaque: false,
    },
    {
        nome: 'Combo Completo',
        descricao: 'Corte + Barba + Sobrancelha. A experiência completa.',
        preco: 40,
        duracao: '1h',
        imagem: '/servicos/combo.jpg',
        destaque: true,
    },
]

const profissionais = [
    {
        nome: 'Marcão Machadada',
        especialidade: 'Especialista em cortes modernos e barbas',
        avaliacao: 4.9,
        avaliacoes: 250,
        imagem: '/profissionais/profissional-1.jpg',
    },
    {
        nome: 'Carlos Barba',
        especialidade: 'Especialista em barba e bigode',
        avaliacao: 4.8,
        avaliacoes: 180,
        imagem: '/profissionais/profissional-2.jpg',
    },
]

const diferenciais = [
    {
        icone: CalendarCheck,
        titulo: 'Agendamento online 24h',
        texto: 'Escolha profissional, serviço e horário em segundos, sem precisar ligar.',
    },
    {
        icone: ShieldCheck,
        titulo: 'Profissionais especialistas',
        texto: 'Barbeiros avaliados pelos clientes, com nota média acima de 4,8.',
    },
    {
        icone: Sparkles,
        titulo: 'Experiência premium',
        texto: 'Ambiente climatizado, atendimento no horário e acabamento impecável.',
    },
]

const horarios = [
    { dia: 'Segunda a Sexta', hora: '08h — 21h' },
    { dia: 'Sábado', hora: '08h — 18h' },
    { dia: 'Domingo', hora: 'Fechado' },
]

function Marca() {
    return (
        <Link href="/barbearia" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-zinc-900">
                <Scissors size={18} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black tracking-tight text-white">
                Barbearia <span className="text-yellow-400">Brutal</span>
            </span>
        </Link>
    )
}

export default function BarbeariaLandingPage() {
    return (
        <div className="min-h-screen scroll-smooth bg-zinc-950 text-zinc-100">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Marca />
                    <nav className="hidden items-center gap-8 md:flex">
                        <a href="#servicos" className="text-sm text-zinc-300 transition-colors hover:text-white">
                            Serviços
                        </a>
                        <a href="#equipe" className="text-sm text-zinc-300 transition-colors hover:text-white">
                            Equipe
                        </a>
                        <a href="#contato" className="text-sm text-zinc-300 transition-colors hover:text-white">
                            Contato
                        </a>
                    </nav>
                    <Link
                        href={AGENDAR_HREF}
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-zinc-900 transition-all hover:bg-yellow-300 active:scale-95"
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
                        alt="Barbearia Brutal"
                        fill
                        priority
                        className="object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/85 to-zinc-950" />
                </div>

                <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 text-center">
                    <div className="animate-fade-in mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5">
                        <Scissors size={14} className="text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-300">
                            A barbearia mais brutal da cidade
                        </span>
                    </div>

                    <h1 className="animate-slide-up text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
                        Seu estilo,{' '}
                        <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                            no capricho.
                        </span>
                    </h1>
                    <p className="animate-slide-up mx-auto mt-6 max-w-xl text-lg text-zinc-300">
                        Corte, barba e combo completo com barbeiros especialistas. Agende online e
                        seja atendido exatamente no horário marcado.
                    </p>

                    <div className="animate-slide-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={AGENDAR_HREF}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3.5 font-bold text-zinc-900 shadow-lg shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95 sm:w-auto"
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

                    <div className="mt-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>
                        <span>4,9 de 5 · +400 clientes atendidos</span>
                    </div>
                </div>
            </section>

            {/* Serviços */}
            <section id="servicos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <div className="mb-12 text-center">
                    <span className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
                        Serviços
                    </span>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                        Escolha seu serviço
                    </h2>
                    <p className="mt-3 text-zinc-400">Preços justos, resultado brutal.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {servicos.map((servico) => (
                        <div
                            key={servico.nome}
                            className={`group flex flex-col overflow-hidden rounded-2xl border bg-zinc-900/60 transition-all hover:-translate-y-1 ${
                                servico.destaque
                                    ? 'border-yellow-400/60 shadow-lg shadow-yellow-400/10'
                                    : 'border-zinc-800 hover:border-zinc-700'
                            }`}
                        >
                            <div className="relative h-44 overflow-hidden">
                                <Image
                                    src={servico.imagem}
                                    alt={servico.nome}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                {servico.destaque && (
                                    <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase text-zinc-900">
                                        Mais pedido
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-bold text-white">{servico.nome}</h3>
                                    <span className="whitespace-nowrap text-lg font-black text-yellow-400">
                                        R$ {servico.preco},00
                                    </span>
                                </div>
                                <p className="mt-2 flex-1 text-sm text-zinc-400">{servico.descricao}</p>
                                <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                                    <Clock size={14} />
                                    <span>{servico.duracao}</span>
                                </div>
                                <Link
                                    href={AGENDAR_HREF}
                                    className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                                        servico.destaque
                                            ? 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300'
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
            </section>

            {/* Diferenciais */}
            <section className="border-y border-zinc-800/80 bg-zinc-900/30">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6">
                    {diferenciais.map((item) => (
                        <div key={item.titulo} className="text-center sm:text-left">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/80 text-yellow-400 sm:mx-0">
                                <item.icone size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-white">{item.titulo}</h3>
                            <p className="mt-1.5 text-sm text-zinc-400">{item.texto}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Equipe */}
            <section id="equipe" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <div className="mb-12 text-center">
                    <span className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
                        Equipe
                    </span>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                        Nossos profissionais
                    </h2>
                    <p className="mt-3 text-zinc-400">Mãos de mestre para o seu visual.</p>
                </div>

                <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
                    {profissionais.map((prof) => (
                        <div
                            key={prof.nome}
                            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700"
                        >
                            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
                                <Image src={prof.imagem} alt={prof.nome} fill className="object-cover" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold text-white">{prof.nome}</h3>
                                <p className="text-sm text-zinc-400">{prof.especialidade}</p>
                                <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                                    <Star size={15} className="fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold text-white">{prof.avaliacao}</span>
                                    <span className="text-zinc-500">({prof.avaliacoes})</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contato / Horário / Localização */}
            <section id="contato" className="border-t border-zinc-800/80 bg-zinc-900/30">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3">
                    <div>
                        <div className="mb-4 flex items-center gap-2 text-yellow-400">
                            <Clock size={20} />
                            <h3 className="text-lg font-bold text-white">Horário</h3>
                        </div>
                        <ul className="space-y-2 text-sm">
                            {horarios.map((h) => (
                                <li key={h.dia} className="flex justify-between border-b border-zinc-800 pb-2">
                                    <span className="text-zinc-400">{h.dia}</span>
                                    <span className="font-medium text-zinc-200">{h.hora}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <div className="mb-4 flex items-center gap-2 text-yellow-400">
                            <MapPin size={20} />
                            <h3 className="text-lg font-bold text-white">Onde estamos</h3>
                        </div>
                        <p className="text-sm text-zinc-300">Rua das Flores, 123</p>
                        <p className="text-sm text-zinc-400">São Paulo/SP</p>
                    </div>

                    <div>
                        <div className="mb-4 flex items-center gap-2 text-yellow-400">
                            <Phone size={20} />
                            <h3 className="text-lg font-bold text-white">Fale com a gente</h3>
                        </div>
                        <a
                            href="tel:+5511999999999"
                            className="block text-sm text-zinc-300 transition-colors hover:text-white"
                        >
                            (11) 99999-9999
                        </a>
                        <a
                            href="#"
                            className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                        >
                            <Instagram size={16} />
                            @barbeariabrutal
                        </a>
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-zinc-900 to-zinc-950 px-6 py-14 text-center">
                    <div className="absolute -inset-10 bg-yellow-400/5 blur-3xl" aria-hidden />
                    <div className="relative">
                        <h2 className="text-3xl font-black text-white sm:text-4xl">
                            Pronto para o próximo corte?
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg text-zinc-300">
                            Garanta seu horário em poucos cliques. Sem fila, sem espera.
                        </p>
                        <Link
                            href={AGENDAR_HREF}
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 font-bold text-zinc-900 shadow-lg shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95"
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
                        © {new Date().getFullYear()} Barbearia Brutal. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    )
}
