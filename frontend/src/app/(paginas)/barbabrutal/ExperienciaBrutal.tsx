'use client'

/**
 * BARBA BRUTAL — landing cinematográfica com rolagem 3D.
 *
 * O "filme" é uma sequência de 5 cenas desenhadas em canvas (fotos reais do
 * projeto) com zoom/pan cinematográfico, crossfade, luz volumétrica, vinheta e
 * grão — tudo controlado pela rolagem via GSAP ScrollTrigger (canvas fixado) e
 * Lenis (smooth scroll). Rolar para baixo avança a história; para cima, volta.
 *
 * Quando houver créditos de geração (Higgsfield), basta trocar as imagens das
 * cenas por sequências de quadros dos clipes — a engenharia permanece a mesma.
 *
 * Acessibilidade/perf: em `prefers-reduced-motion` a página vira uma versão
 * estática equivalente (sem pin, sem smooth scroll); no mobile o motor roda
 * mais leve (sem grão, DPR limitado).
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
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

interface Cena {
    src: string
    kicker: string
    titulo: string
    texto: string
    // transformações da câmera (zoom/pan de início → fim da cena)
    z0: number
    z1: number
    px0: number
    px1: number
    py0: number
    py1: number
    // feixe de luz volumétrica
    beamX: number
    beamAngle: number
    beamAlpha: number
}

const CENAS: Cena[] = [
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

const N = CENAS.length

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)
/** 0→1 dentro da janela [a,b] com suavização */
const janela = (p: number, a: number, b: number) => smooth(clamp((p - a) / (b - a), 0, 1))

function desenharCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    zoom: number,
    panX: number,
    panY: number
) {
    const ir = img.width / img.height
    const r = w / h
    let dw: number, dh: number
    if (ir > r) {
        dh = h
        dw = h * ir
    } else {
        dw = w
        dh = w / ir
    }
    dw *= zoom
    dh *= zoom
    const ox = (w - dw) / 2 + (panX * (dw - w)) / 2
    const oy = (h - dh) / 2 + (panY * (dh - h)) / 2
    ctx.drawImage(img, ox, oy, dw, dh)
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export default function ExperienciaBrutal() {
    const [modoLeve, setModoLeve] = useState(false)

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setModoLeve(true)
        }
    }, [])

    return modoLeve ? <VersaoEstatica /> : <VersaoCinematografica />
}

/* ================== Versão cinematográfica (padrão) ================== */

function VersaoCinematografica() {
    const filmeRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const ctaFinalRef = useRef<HTMLDivElement>(null)
    const legendasRef = useRef<Array<HTMLDivElement | null>>([])
    const dotsRef = useRef<Array<HTMLSpanElement | null>>([])
    const lenisRef = useRef<Lenis | null>(null)
    const [pronto, setPronto] = useState(false)

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        const lite = window.innerWidth < 768
        const dprMax = lite ? 1.5 : 2

        let largura = 0
        let altura = 0
        let progresso = 0
        let sujo = true
        let destruido = false

        /* ---- smooth scroll (Lenis) sincronizado com ScrollTrigger ---- */
        const lenis = new Lenis({ lerp: 0.1 })
        lenisRef.current = lenis
        lenis.on('scroll', ScrollTrigger.update)
        const tickLenis = (time: number) => lenis.raf(time * 1000)
        gsap.ticker.add(tickLenis)
        gsap.ticker.lagSmoothing(0)

        /* ---- grão de filme (offscreen, gerado uma vez) ---- */
        const grao = document.createElement('canvas')
        grao.width = 160
        grao.height = 160
        {
            const gctx = grao.getContext('2d')!
            const dados = gctx.createImageData(160, 160)
            for (let i = 0; i < dados.data.length; i += 4) {
                const v = Math.floor(Math.random() * 255)
                dados.data[i] = v
                dados.data[i + 1] = v
                dados.data[i + 2] = v
                dados.data[i + 3] = 18
            }
            gctx.putImageData(dados, 0, 0)
        }

        /* ---- carregamento das cenas ---- */
        const imagens: HTMLImageElement[] = CENAS.map((c) => {
            const img = new Image()
            img.src = c.src
            return img
        })

        /* ---- sequências de quadros dos clipes (npm run filme:quadros) ----
           Se public/filme/manifest.json existir, cada cena vira um "vídeo"
           reproduzido pela rolagem (frame a frame). Sem manifesto, as fotos
           com câmera Ken Burns continuam como fallback. */
        const quadrosPorCena: Array<HTMLImageElement[] | null> = CENAS.map(() => null)
        fetch('/filme/manifest.json')
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
                if (!m || destruido || !Array.isArray(m.cenas)) return
                for (const c of m.cenas) {
                    const i = Number(c.cena) - 1
                    if (i < 0 || i >= N || !c.quadros) continue
                    const passo = lite ? 2 : 1 // mobile carrega metade dos quadros
                    const lista: HTMLImageElement[] = []
                    for (let q = 1; q <= c.quadros; q += passo) {
                        const img = new Image()
                        img.src = `${c.pasta}/q-${String(q).padStart(3, '0')}.jpg`
                        img.onload = () => { sujo = true }
                        lista.push(img)
                    }
                    quadrosPorCena[i] = lista
                }
            })
            .catch(() => { /* sem manifesto → fotos */ })
        Promise.all(
            imagens.map(
                (img) =>
                    new Promise<void>((res) => {
                        if (img.complete) return res()
                        img.onload = () => res()
                        img.onerror = () => res()
                    })
            )
        ).then(() => {
            if (destruido) return
            sujo = true
            setPronto(true)
            ScrollTrigger.refresh()
        })

        /* ---- dimensionamento ---- */
        function redimensionar() {
            const dpr = Math.min(window.devicePixelRatio || 1, dprMax)
            largura = canvas.clientWidth
            altura = canvas.clientHeight
            canvas.width = Math.round(largura * dpr)
            canvas.height = Math.round(altura * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            sujo = true
        }
        redimensionar()
        window.addEventListener('resize', redimensionar)

        /* ---- feixe de luz volumétrica ---- */
        function desenharFeixe(x: number, angulo: number, alfa: number) {
            if (alfa <= 0) return
            ctx.save()
            ctx.globalCompositeOperation = 'lighter'
            ctx.translate(largura * x, -altura * 0.1)
            ctx.rotate(angulo)
            const g = ctx.createLinearGradient(0, 0, 0, altura * 1.4)
            g.addColorStop(0, `rgba(255, 200, 110, ${alfa})`)
            g.addColorStop(0.6, `rgba(255, 180, 80, ${alfa * 0.35})`)
            g.addColorStop(1, 'rgba(255, 180, 80, 0)')
            ctx.fillStyle = g
            ctx.fillRect(-largura * 0.14, 0, largura * 0.28, altura * 1.4)
            ctx.restore()
        }

        /* ---- desenha uma cena com transform em t (0..1) ---- */
        function desenharCena(i: number, t: number, alfa: number) {
            const e = smooth(t)

            // Com clipes convertidos em quadros: rolagem reproduz o vídeo.
            const seq = quadrosPorCena[i]
            if (seq && seq.length) {
                const idx = Math.min(seq.length - 1, Math.floor(t * seq.length))
                const q = seq[idx]
                if (q && q.complete && q.naturalWidth > 0) {
                    ctx.save()
                    ctx.globalAlpha = alfa
                    desenharCover(ctx, q, largura, altura, lerp(1.02, 1.08, e), 0, 0)
                    ctx.restore()
                    return
                }
            }

            // Fallback: foto com câmera Ken Burns (zoom/pan).
            const c = CENAS[i]
            const img = imagens[i]
            if (!img.complete || img.naturalWidth === 0) return
            ctx.save()
            ctx.globalAlpha = alfa
            desenharCover(
                ctx,
                img,
                largura,
                altura,
                lerp(c.z0, c.z1, e),
                lerp(c.px0, c.px1, e),
                lerp(c.py0, c.py1, e)
            )
            ctx.restore()
        }

        /* ---- quadro completo ---- */
        function desenhar() {
            if (largura === 0 || altura === 0) return
            ctx.clearRect(0, 0, largura, altura)
            ctx.fillStyle = '#0b0b0f'
            ctx.fillRect(0, 0, largura, altura)

            const pos = clamp(progresso, 0, 0.9999) * N
            const i = Math.min(N - 1, Math.floor(pos))
            const t = pos - i

            desenharCena(i, t, 1)

            // crossfade para a próxima cena no fim do trecho
            const inicioFade = 0.8
            if (t > inicioFade && i < N - 1) {
                const k = smooth((t - inicioFade) / (1 - inicioFade))
                desenharCena(i + 1, k * 0.12, k)
            }

            // feixe de luz da cena dominante
            const cena = t > 0.9 && i < N - 1 ? CENAS[i + 1] : CENAS[i]
            desenharFeixe(cena.beamX, cena.beamAngle, cena.beamAlpha)

            // banho quente (grade de cor)
            ctx.fillStyle = 'rgba(245, 185, 80, 0.05)'
            ctx.fillRect(0, 0, largura, altura)

            // vinheta
            const v = ctx.createRadialGradient(
                largura / 2, altura / 2, Math.min(largura, altura) * 0.35,
                largura / 2, altura / 2, Math.max(largura, altura) * 0.75
            )
            v.addColorStop(0, 'rgba(8, 8, 12, 0)')
            v.addColorStop(1, 'rgba(8, 8, 12, 0.62)')
            ctx.fillStyle = v
            ctx.fillRect(0, 0, largura, altura)

            // degradê inferior para legibilidade dos textos
            const b = ctx.createLinearGradient(0, altura, 0, altura * 0.45)
            b.addColorStop(0, 'rgba(8, 8, 12, 0.72)')
            b.addColorStop(1, 'rgba(8, 8, 12, 0)')
            ctx.fillStyle = b
            ctx.fillRect(0, 0, largura, altura)

            // grão de filme (desktop apenas)
            if (!lite) {
                ctx.save()
                ctx.globalAlpha = 0.5
                const pat = ctx.createPattern(grao, 'repeat')
                if (pat) {
                    ctx.fillStyle = pat
                    ctx.fillRect(0, 0, largura, altura)
                }
                ctx.restore()
            }
        }

        /* ---- overlays HTML (legendas, hero, cta, dots) ---- */
        function atualizarOverlays() {
            const p = progresso
            const seg = 1 / N

            // hero: visível no início da cena 1, some ao avançar
            if (heroRef.current) {
                const a = 1 - janela(p, seg * 0.45, seg * 0.8)
                heroRef.current.style.opacity = String(a)
                heroRef.current.style.transform = `translateY(${(1 - a) * -28}px)`
                heroRef.current.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
            }

            // legendas por cena (a última permanece até o fim)
            for (let i = 0; i < N; i++) {
                const el = legendasRef.current[i]
                if (!el) continue
                const ini = i * seg
                const fim = (i + 1) * seg
                const entrada = janela(p, ini + seg * (i === 0 ? 0.45 : 0.12), ini + seg * (i === 0 ? 0.62 : 0.3))
                const saida = i === N - 1 ? 0 : janela(p, fim - seg * 0.16, fim - seg * 0.02)
                const a = entrada * (1 - saida)
                el.style.opacity = String(a)
                el.style.transform = `translateY(${(1 - entrada) * 34 + saida * -22}px)`
            }

            // CTA final: aparece no último trecho
            if (ctaFinalRef.current) {
                const a = janela(p, 1 - seg * 0.42, 1 - seg * 0.18)
                ctaFinalRef.current.style.opacity = String(a)
                ctaFinalRef.current.style.transform = `translateY(${(1 - a) * 26}px)`
                ctaFinalRef.current.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
            }

            // indicador de capítulos
            const ativo = Math.min(N - 1, Math.floor(p * N))
            dotsRef.current.forEach((d, i) => {
                if (!d) return
                d.style.backgroundColor = i === ativo ? '#f5b942' : 'rgba(255,255,255,0.28)'
                d.style.transform = i === ativo ? 'scale(1.5)' : 'scale(1)'
            })
        }

        /* ---- ScrollTrigger: fixa o canvas e controla o progresso ---- */
        const st = ScrollTrigger.create({
            trigger: filmeRef.current!,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                progresso = self.progress
                sujo = true
            },
        })

        const tickPintura = () => {
            if (!sujo) return
            sujo = false
            desenhar()
            atualizarOverlays()
        }
        gsap.ticker.add(tickPintura)

        return () => {
            destruido = true
            window.removeEventListener('resize', redimensionar)
            gsap.ticker.remove(tickLenis)
            gsap.ticker.remove(tickPintura)
            st.kill()
            lenis.destroy()
            lenisRef.current = null
        }
    }, [])

    /* âncoras internas com smooth scroll */
    function irPara(e: React.MouseEvent<HTMLAnchorElement>, hash: string) {
        e.preventDefault()
        const alvo = document.querySelector(hash) as HTMLElement | null
        if (!alvo) return
        if (lenisRef.current) lenisRef.current.scrollTo(alvo, { offset: -64 })
        else alvo.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div id="topo" className="bg-[#0e0e12] text-[#f5f1e8] antialiased">
            <Cabecalho irPara={irPara} />

            {/* ============ O FILME (canvas fixado, 5 cenas) ============ */}
            <section ref={filmeRef} aria-label="Apresentação" style={{ height: `${N * 110}vh` }}>
                <div className="sticky top-0 h-screen overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className={`h-full w-full transition-opacity duration-700 ${pronto ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden
                    />

                    {/* barras de letterbox */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[5vh] bg-black/90" aria-hidden />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[5vh] bg-black/90" aria-hidden />

                    {/* HERO (cena 1) */}
                    <div
                        ref={heroRef}
                        data-testid="hero"
                        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                    >
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
                    </div>

                    {/* legendas das cenas */}
                    {CENAS.map((c, i) => (
                        <div
                            key={c.src}
                            ref={(el) => { legendasRef.current[i] = el }}
                            data-testid={`legenda-${i}`}
                            className="pointer-events-none absolute inset-x-0 bottom-[12vh] px-6 text-center opacity-0 sm:bottom-[14vh]"
                        >
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-300/90">
                                {c.kicker}
                            </p>
                            <h2
                                className="mx-auto max-w-3xl text-3xl font-black leading-tight sm:text-5xl"
                                style={{ fontFamily: 'var(--font-outfit)' }}
                            >
                                {c.titulo}
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-300 sm:text-base">{c.texto}</p>
                            {i === N - 1 && (
                                <div
                                    ref={ctaFinalRef}
                                    data-testid="cta-final"
                                    className="pointer-events-auto mt-6 flex justify-center opacity-0"
                                >
                                    <a
                                        href={WHATSAPP_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-900 shadow-[0_0_40px_rgba(245,185,66,0.35)] transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <MessageCircle size={18} />
                                        Agendar no WhatsApp
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* indicador de capítulos */}
                    <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2.5 sm:right-6" aria-hidden>
                        {CENAS.map((c, i) => (
                            <span
                                key={c.src}
                                ref={(el) => { dotsRef.current[i] = el }}
                                className="h-1.5 w-1.5 rounded-full bg-white/30 transition-all duration-300"
                            />
                        ))}
                    </div>
                </div>
            </section>

            <Conteudo />
        </div>
    )
}

/* ================== Versão estática (reduced motion) ================== */

function VersaoEstatica() {
    return (
        <div id="topo" className="bg-[#0e0e12] text-[#f5f1e8] antialiased">
            <Cabecalho />
            <section aria-label="Apresentação">
                <div className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={CENAS[0].src}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-transparent to-[#0e0e12]/70" />
                    <div className="relative">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.5em] text-amber-300/90">Barbearia</p>
                        <h1 className="text-5xl font-black sm:text-7xl" style={{ fontFamily: 'var(--font-outfit)' }}>
                            BARBA <span className="text-amber-400">BRUTAL</span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-zinc-300">
                            Corte, barba e acabamento com hora marcada — uma experiência, não uma fila.
                        </p>
                    </div>
                </div>
                {CENAS.slice(1).map((c) => (
                    <figure key={c.src} className="relative mx-auto max-w-5xl px-4 py-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.src} alt={c.titulo} className="w-full rounded-2xl object-cover" />
                        <figcaption className="mt-4 text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-300/90">{c.kicker}</p>
                            <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: 'var(--font-outfit)' }}>{c.titulo}</h2>
                            <p className="mt-2 text-sm text-zinc-400">{c.texto}</p>
                        </figcaption>
                    </figure>
                ))}
            </section>
            <Conteudo />
        </div>
    )
}

/* ================== Cabeçalho fixo com âncoras ================== */

function Cabecalho({
    irPara,
}: {
    irPara?: (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => void
}) {
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
                    onClick={(e) => irPara?.(e, '#topo')}
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
                            onClick={(e) => irPara?.(e, hash)}
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
