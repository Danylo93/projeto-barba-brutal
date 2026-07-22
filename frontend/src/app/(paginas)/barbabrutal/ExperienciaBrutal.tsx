'use client'

/**
 * BARBA BRUTAL — landing cinematográfica com rolagem 3D.
 * O filme (5 cenas) roda no motor reutilizável FilmeScroll; aqui ficam o
 * conteúdo real da barbearia (serviços, equipe, FAQ, WhatsApp) e as seções.
 */

import Link from 'next/link'
import FilmeScroll, { CenaFilme } from '@/components/filme/FilmeScroll'
import {
    Scissors,
    Star,
    MapPin,
    Clock,
    MessageCircle,
    CalendarCheck,
    ChevronDown,
    ArrowDown,
} from 'lucide-react'


/* ------------------------------------------------------------------ */
/* Conteúdo real (extraído do sistema — tenant demo / seed)            */
/* ------------------------------------------------------------------ */

const WHATSAPP = '5511999999999' // telefone real cadastrado na barbearia (seed)
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    'Olá! Quero agendar um horário na Barba Brutal.'
)}`
const AGENDAR_ONLINE = '/entrar?tenant=1&destino=%2Fagendamento'
const ENDERECO = 'Rua das Flores, 123 — São Paulo/SP'
const HORARIO = 'Seg a Sáb · 08h às 21h'

const SERVICOS = [
    {
        nome: 'Corte de Cabelo',
        descricao: 'Corte moderno e estiloso',
        preco: 25,
        imagem: '/servicos/corte-de-cabelo.jpg',
    },
    {
        nome: 'Corte de Barba',
        descricao: 'Barba bem feita e estilosa',
        preco: 20,
        imagem: '/servicos/corte-de-barba.jpg',
    },
    {
        nome: 'Combo Completo',
        descricao: 'Corte + Barba + Sobrancelha',
        preco: 40,
        imagem: '/servicos/combo.jpg',
        destaque: true,
    },
]

const EQUIPE = [
    {
        nome: 'Marcão Machadada',
        descricao: 'Especialista em cortes modernos e barbas',
        avaliacao: 4.9,
        avaliacoes: 250,
        imagem: '/profissionais/profissional-1.jpg',
    },
    {
        nome: 'Carlos Barba',
        descricao: 'Especialista em barba e bigode',
        avaliacao: 4.8,
        avaliacoes: 180,
        imagem: '/profissionais/profissional-2.jpg',
    },
]

const FAQ = [
    {
        p: 'Como funciona o agendamento?',
        r: 'Você agenda online, 24h por dia: escolhe o profissional, os serviços, o dia e o horário disponível — a confirmação é na hora. Se preferir, chama no WhatsApp que a gente marca junto.',
    },
    {
        p: 'Posso remarcar meu horário?',
        r: 'Pode. E se você já tiver um horário no mesmo dia e tentar marcar outro, o sistema avisa e oferece remarcar automaticamente para o novo horário.',
    },
    {
        p: 'Qual o horário de funcionamento?',
        r: 'De segunda a sábado, das 08h às 21h. Cada dia pode ter horário próprio (domingo, por exemplo, pode fechar mais cedo) — os horários disponíveis aparecem no agendamento.',
    },
    {
        p: 'O Combo Completo compensa?',
        r: 'O Combo Completo (R$ 40) já inclui corte + barba + sobrancelha em um único horário. Serviços avulsos também podem ser combinados entre si na hora de agendar.',
    },
    {
        p: 'Recebo lembrete do meu horário?',
        r: 'Sim — o sistema envia lembrete pelo WhatsApp perto do seu horário, para você não perder a hora.',
    },
    {
        p: 'Onde fica a barbearia?',
        r: `${ENDERECO}. Chega chegando: é só apontar o nome na recepção.`,
    },
]

/* ------------------------------------------------------------------ */
/* Cenas do filme                                                      */
/* ------------------------------------------------------------------ */

const CENAS: CenaFilme[] = [
    {
        src: '/banners/principal.webp',
        kicker: 'A experiência',
        titulo: 'Tudo começa antes da tesoura.',
        texto: 'Luz baixa, ferramentas alinhadas, cadeira pronta. Role para viver o ritual.',
        z0: 1.22, z1: 1.04, px0: 0.25, px1: -0.1, py0: -0.15, py1: 0.05,
        beamX: 0.72, beamAngle: -0.42, beamAlpha: 0.16,
    },
    {
        src: '/servicos/corte-de-cabelo.jpg',
        kicker: 'Capítulo 01 — Corte',
        titulo: 'Precisão em cada fio.',
        texto: 'Máquina, tesoura e pente. O degradê toma forma, limpo e na régua.',
        z0: 1.02, z1: 1.24, px0: -0.2, px1: 0.15, py0: 0.1, py1: -0.12,
        beamX: 0.3, beamAngle: 0.35, beamAlpha: 0.13,
    },
    {
        src: '/servicos/corte-de-barba.jpg',
        kicker: 'Capítulo 02 — Barba',
        titulo: 'Toalha quente. Navalha precisa.',
        texto: 'O ritual clássico: vapor, espuma e contorno definido no detalhe.',
        z0: 1.18, z1: 1.02, px0: 0.15, px1: -0.18, py0: -0.1, py1: 0.08,
        beamX: 0.65, beamAngle: -0.3, beamAlpha: 0.15,
    },
    {
        src: '/servicos/combo.jpg',
        kicker: 'Capítulo 03 — Acabamento',
        titulo: 'O detalhe que fecha o visual.',
        texto: 'Contorno alinhado, sobrancelha e pezinho no capricho. Nada por acaso.',
        z0: 1.04, z1: 1.2, px0: -0.12, px1: 0.2, py0: 0.12, py1: -0.08,
        beamX: 0.4, beamAngle: 0.4, beamAlpha: 0.12,
    },
    {
        src: '/banners/profissionais.webp',
        kicker: 'O resultado',
        titulo: 'Confere no espelho. Sai pronto.',
        texto: 'Agende seu horário e viva isso na cadeira — hora marcada, sem fila.',
        z0: 1.16, z1: 1.0, px0: -0.1, px1: 0.0, py0: -0.08, py1: 0.0,
        beamX: 0.5, beamAngle: -0.2, beamAlpha: 0.18,
    },
]

export default function ExperienciaBrutal() {
    return (
        <div id="topo" className="bg-[#0e0e12] text-[#f5f1e8] antialiased">
            <Cabecalho />
            <FilmeScroll
                cenas={CENAS}
                hero={<HeroBrutal />}
                ctaFinal={
                    <a
                        href={WHATSAPP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-900 shadow-[0_0_40px_rgba(245,185,66,0.35)] transition-transform hover:scale-105 active:scale-95"
                    >
                        <MessageCircle size={18} />
                        Agendar no WhatsApp
                    </a>
                }
            />
            <Conteudo />
        </div>
    )
}

function HeroBrutal() {
    return (
        <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.5em] text-amber-300/90">
                Barbearia
            </p>
            <h1
                className="text-5xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl"
                style={{ fontFamily: 'var(--font-outfit)' }}
            >
                BARBA{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    BRUTAL
                </span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-zinc-300 sm:text-lg">
                Corte, barba e acabamento com hora marcada — uma experiência, não uma fila.
            </p>
            <div className="mt-10 flex flex-col items-center gap-2 text-zinc-400">
                <span className="text-xs uppercase tracking-[0.3em]">Role para viver</span>
                <ArrowDown className="animate-bounce text-amber-300" size={20} />
            </div>
        </>
    )
}

function Cabecalho() {
    const links = [
        ['#servicos', 'Serviços'],
        ['#historia', 'A casa'],
        ['#agendamento', 'Agendar'],
        ['#faq', 'Dúvidas'],
    ] as const

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0e0e12]/70 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
                <a
                    href="#topo"
                    className="flex items-center gap-2 text-sm font-black tracking-widest"
                    style={{ fontFamily: 'var(--font-outfit)' }}
                >
                    <Scissors size={16} className="text-amber-400" />
                    BARBA <span className="text-amber-400">BRUTAL</span>
                </a>
                <nav className="hidden items-center gap-6 md:flex">
                    {links.map(([hash, rotulo]) => (
                        <a
                            key={hash}
                            href={hash}
                            className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                        >
                            {rotulo}
                        </a>
                    ))}
                </nav>
                <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-900 transition-transform hover:scale-105 active:scale-95 sm:text-sm"
                >
                    <MessageCircle size={15} />
                    WhatsApp
                </a>
            </div>
        </header>
    )
}

/* ================== Seções de conteúdo (dados reais) ================== */

function Conteudo() {
    return (
        <>
            {/* SERVIÇOS */}
            <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
                <TituloSecao kicker="Serviços" titulo="O menu da casa" />
                <div className="grid gap-5 sm:grid-cols-3">
                    {SERVICOS.map((s) => (
                        <div
                            key={s.nome}
                            className={`reveal-up group overflow-hidden rounded-2xl border bg-zinc-900/60 transition-transform duration-300 hover:-translate-y-1 ${
                                s.destaque ? 'border-amber-400/40' : 'border-white/5'
                            }`}
                        >
                            <div className="relative h-44 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={s.imagem}
                                    alt={s.nome}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {s.destaque && (
                                    <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900">
                                        Mais pedido
                                    </span>
                                )}
                            </div>
                            <div className="flex items-start justify-between gap-3 p-5">
                                <div>
                                    <h3 className="font-bold text-white">{s.nome}</h3>
                                    <p className="mt-1 text-sm text-zinc-400">{s.descricao}</p>
                                </div>
                                <span className="whitespace-nowrap text-lg font-black text-amber-400">
                                    R$ {s.preco}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* HISTÓRIA / EQUIPE */}
            <section id="historia" className="scroll-mt-20 border-y border-white/5 bg-zinc-900/40">
                <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
                    <TituloSecao kicker="A casa" titulo="Quem segura a navalha" />
                    <div className="grid gap-5 sm:grid-cols-2">
                        {EQUIPE.map((p) => (
                            <div
                                key={p.nome}
                                className="reveal-up flex items-center gap-5 rounded-2xl border border-white/5 bg-[#0e0e12] p-5"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={p.imagem}
                                    alt={p.nome}
                                    className="h-24 w-24 rounded-xl object-cover"
                                />
                                <div>
                                    <h3 className="font-bold text-white">{p.nome}</h3>
                                    <p className="mt-1 text-sm text-zinc-400">{p.descricao}</p>
                                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-amber-400">
                                        <Star size={14} className="fill-current" />
                                        <strong>{p.avaliacao.toFixed(1)}</strong>
                                        <span className="text-zinc-500">· {p.avaliacoes} avaliações</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="reveal-up mt-6 text-center text-sm text-zinc-500">
                        Avaliações registradas pelos clientes no sistema de agendamento da casa.
                    </p>
                </div>
            </section>

            {/* AGENDAMENTO */}
            <section id="agendamento" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
                <TituloSecao kicker="Como funciona" titulo="Agendar leva um minuto" />
                <ol className="grid gap-4 sm:grid-cols-4">
                    {[
                        ['Escolha o profissional', 'Cada barbeiro mostra os serviços que executa.'],
                        ['Monte seu serviço', 'Avulsos combináveis ou o Combo Completo.'],
                        ['Dia e horário', 'Só aparecem horários realmente livres.'],
                        ['Confirmado', 'Lembrete no WhatsApp perto da hora.'],
                    ].map(([t, d], i) => (
                        <li
                            key={t}
                            className="reveal-up rounded-2xl border border-white/5 bg-zinc-900/60 p-5"
                        >
                            <span className="text-2xl font-black text-amber-400/80">{String(i + 1).padStart(2, '0')}</span>
                            <h3 className="mt-2 font-bold text-white">{t}</h3>
                            <p className="mt-1 text-sm text-zinc-400">{d}</p>
                        </li>
                    ))}
                </ol>
                <div className="reveal-up mt-10 flex flex-wrap justify-center gap-3">
                    <Link
                        href={AGENDAR_ONLINE}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-zinc-900 transition-transform hover:scale-105 active:scale-95"
                    >
                        <CalendarCheck size={18} />
                        Agendar online agora
                    </Link>
                    <a
                        href={WHATSAPP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 px-6 py-3 font-bold text-amber-300 transition-colors hover:bg-amber-400/10"
                    >
                        <MessageCircle size={18} />
                        Prefiro pelo WhatsApp
                    </a>
                </div>
            </section>

            {/* AVALIAÇÕES */}
            <section id="depoimentos" className="scroll-mt-20 border-y border-white/5 bg-zinc-900/40">
                <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
                    <TituloSecao kicker="Avaliações" titulo="A cadeira fala por nós" />
                    <div className="reveal-up flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-5xl font-black text-white">
                            4.9
                            <Star size={36} className="fill-current text-amber-400" />
                        </div>
                        <p className="text-zinc-400">
                            Média de <strong className="text-white">430+ avaliações</strong> registradas por clientes após o atendimento.
                        </p>
                    </div>
                    <div className="reveal-up mt-10 flex justify-center -space-x-3">
                        {[1, 2, 3, 4].map((n) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                key={n}
                                src={`/clientes/cliente-${n}.jpg`}
                                alt=""
                                className="h-14 w-14 rounded-full border-2 border-[#0e0e12] object-cover"
                            />
                        ))}
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0e0e12] bg-amber-400 text-xs font-black text-zinc-900">
                            +400
                        </span>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
                <TituloSecao kicker="Dúvidas" titulo="Perguntas frequentes" />
                <div className="flex flex-col gap-3">
                    {FAQ.map((f) => (
                        <details
                            key={f.p}
                            className="reveal-up group rounded-xl border border-white/5 bg-zinc-900/60 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                                {f.p}
                                <ChevronDown
                                    size={18}
                                    className="shrink-0 text-amber-400 transition-transform group-open:rotate-180"
                                />
                            </summary>
                            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.r}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* CONTATO / CTA FINAL */}
            <section id="contato" className="relative scroll-mt-20 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/banners/clientes.webp"
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-25"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e12] via-[#0e0e12]/80 to-[#0e0e12]" />
                <div className="relative mx-auto max-w-4xl px-4 py-28 text-center sm:px-6">
                    <h2
                        className="text-4xl font-black leading-tight sm:text-6xl"
                        style={{ fontFamily: 'var(--font-outfit)' }}
                    >
                        Sua cadeira está <span className="text-amber-400">esperando.</span>
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-zinc-300">
                        Chama no WhatsApp ou agenda online — hora marcada, sem fila, do jeito que tem que ser.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-zinc-900 shadow-[0_0_50px_rgba(245,185,66,0.3)] transition-transform hover:scale-105 active:scale-95"
                        >
                            <MessageCircle size={20} />
                            Chamar no WhatsApp
                        </a>
                        <Link
                            href={AGENDAR_ONLINE}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-white/5"
                        >
                            <CalendarCheck size={20} />
                            Agendar online
                        </Link>
                    </div>
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-400">
                        <span className="inline-flex items-center gap-2">
                            <MapPin size={15} className="text-amber-400" /> {ENDERECO}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <Clock size={15} className="text-amber-400" /> {HORARIO}
                        </span>
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-zinc-600">
                <p>
                    Barba Brutal Barbearia · {ENDERECO} ·{' '}
                    <a href={WHATSAPP_LINK} className="text-zinc-500 underline-offset-2 hover:text-amber-400 hover:underline">
                        WhatsApp
                    </a>
                </p>
                <p className="mt-2">
                    Agendamentos por{' '}
                    <Link href="/" className="text-zinc-500 underline-offset-2 hover:text-amber-400 hover:underline">
                        Barbearia Brutal
                    </Link>
                </p>
            </footer>
        </>
    )
}

function TituloSecao({ kicker, titulo }: { kicker: string; titulo: string }) {
    return (
        <div className="reveal-up mb-12 text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-300/90">
                {kicker}
            </p>
            <h2 className="text-3xl font-black sm:text-4xl" style={{ fontFamily: 'var(--font-outfit)' }}>
                {titulo}
            </h2>
        </div>
    )
}
