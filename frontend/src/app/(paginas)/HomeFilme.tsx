'use client'

/**
 * Filme de abertura da home do SaaS (Barbearia Brutal).
 * Mesmo motor/filme da experiência cinematográfica, mas com narrativa de
 * PRODUTO: cada capítulo do ritual da barbearia vira um benefício do sistema.
 * Conversão principal: Começar grátis (/register).
 */

import Link from 'next/link'
import FilmeScroll, { CenaFilme } from '@/components/filme/FilmeScroll'
import { ArrowRight, ArrowDown, Scissors } from 'lucide-react'

const CENAS: CenaFilme[] = [
    {
        src: '/banners/principal.webp',
        kicker: 'A experiência',
        titulo: 'É isso que seu cliente quer viver.',
        texto: 'E é isso que a sua barbearia entrega quando a gestão sai do caminho.',
        z0: 1.22, z1: 1.04, px0: 0.25, px1: -0.1, py0: -0.15, py1: 0.05,
        beamX: 0.72, beamAngle: -0.42, beamAlpha: 0.16,
    },
    {
        src: '/servicos/corte-de-cabelo.jpg',
        kicker: 'Capítulo 01 — Agenda',
        titulo: 'Você cuida do corte. O sistema cuida da agenda.',
        texto: 'Agendamento online 24h: o cliente marca sozinho, só em horários realmente livres.',
        z0: 1.02, z1: 1.24, px0: -0.2, px1: 0.15, py0: 0.1, py1: -0.12,
        beamX: 0.3, beamAngle: 0.35, beamAlpha: 0.13,
    },
    {
        src: '/servicos/corte-de-barba.jpg',
        kicker: 'Capítulo 02 — Clientes',
        titulo: 'Cliente lembrado é cliente na cadeira.',
        texto: 'Lembrete automático no WhatsApp perto do horário — menos faltas, mais receita.',
        z0: 1.18, z1: 1.02, px0: 0.15, px1: -0.18, py0: -0.1, py1: 0.08,
        beamX: 0.65, beamAngle: -0.3, beamAlpha: 0.15,
    },
    {
        src: '/servicos/combo.jpg',
        kicker: 'Capítulo 03 — Gestão',
        titulo: 'Equipe, serviços e combos na régua.',
        texto: 'Cada barbeiro com seus serviços; preços, combos e horário próprio por dia da semana.',
        z0: 1.04, z1: 1.2, px0: -0.12, px1: 0.2, py0: 0.12, py1: -0.08,
        beamX: 0.4, beamAngle: 0.4, beamAlpha: 0.12,
    },
    {
        src: '/banners/profissionais.webp',
        kicker: 'O resultado',
        titulo: 'Cliente pronto. Negócio também.',
        texto: 'Painel com agenda, clientes e receita — e a página da sua barbearia publicada na hora.',
        z0: 1.16, z1: 1.0, px0: -0.1, px1: 0.0, py0: -0.08, py1: 0.0,
        beamX: 0.5, beamAngle: -0.2, beamAlpha: 0.18,
    },
]

export default function HomeFilme() {
    return (
        <FilmeScroll
            cenas={CENAS}
            hero={<HeroSaas />}
            ctaFinal={
                <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-zinc-900 shadow-[0_0_40px_rgba(250,204,21,0.35)] transition-transform hover:scale-105 active:scale-95"
                >
                    Começar grátis por 30 dias
                    <ArrowRight size={18} />
                </Link>
            }
        />
    )
}

function HeroSaas() {
    return (
        <>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5">
                <Scissors size={14} className="text-yellow-400" />
                <span className="text-sm font-medium text-yellow-300">
                    30 dias grátis — sem cartão de crédito
                </span>
            </span>
            <h1
                className="text-4xl font-black leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
                style={{ fontFamily: 'var(--font-outfit)' }}
            >
                Agenda cheia.{' '}
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    Gestão sem caos.
                </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-zinc-300 sm:text-xl">
                Agendamento online 24h, equipe, clientes e receita da sua barbearia — tudo em um só painel.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4">
                <Link
                    href="/register"
                    className="group inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 text-lg font-bold text-zinc-900 shadow-[0_0_40px_rgba(250,204,21,0.25)] transition-all hover:bg-yellow-300 hover:shadow-[0_0_60px_rgba(250,204,21,0.35)] active:scale-[0.98]"
                >
                    Começar grátis por 30 dias
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
            <div className="mt-10 flex flex-col items-center gap-2 text-zinc-500">
                <span className="text-xs uppercase tracking-[0.3em]">Role para conhecer</span>
                <ArrowDown className="animate-bounce text-yellow-400" size={18} />
            </div>
        </>
    )
}
