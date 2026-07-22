'use client'

/**
 * FilmeScroll — motor reutilizável do "filme de rolagem".
 *
 * Desenha uma sequência de cenas em um canvas fixado (CSS sticky) e controla o
 * progresso pela rolagem via GSAP ScrollTrigger, com smooth scroll do Lenis.
 * Rolar para baixo avança a história; para cima, retrocede.
 *
 * Fontes de imagem, por prioridade:
 *  1. Sequências de quadros de vídeo em /filme (manifest.json gerado por
 *     `npm run filme:quadros`) — rolagem reproduz o clipe frame a frame.
 *  2. A foto `src` de cada cena, com câmera Ken Burns (zoom/pan).
 *
 * Overlays em HTML real: `hero` (cena 1), legendas por cena e `ctaFinal`
 * (anexado à última legenda). Âncoras internas (a[href^="#"]) são delegadas ao
 * Lenis automaticamente.
 *
 * Acessibilidade: com `prefers-reduced-motion`, vira uma versão estática
 * equivalente (sem pin, sem smooth scroll, mesmas cenas e textos).
 */

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

export interface CenaFilme {
    src: string
    kicker: string
    titulo: string
    texto: string
    /** câmera Ken Burns (fallback sem quadros de vídeo) */
    z0?: number
    z1?: number
    px0?: number
    px1?: number
    py0?: number
    py1?: number
    /** feixe de luz volumétrica */
    beamX?: number
    beamAngle?: number
    beamAlpha?: number
}

export interface FilmeScrollProps {
    cenas: CenaFilme[]
    /** overlay da primeira cena (título/CTA do hero) */
    hero: React.ReactNode
    /** bloco extra anexado à legenda da última cena (ex.: botão de conversão) */
    ctaFinal?: React.ReactNode
    /** altura de rolagem por cena, em vh (padrão 110) */
    alturaPorCenaVh?: number
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)
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

export default function FilmeScroll(props: FilmeScrollProps) {
    const [modoLeve, setModoLeve] = useState(false)

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setModoLeve(true)
        }
    }, [])

    return modoLeve ? <FilmeEstatico {...props} /> : <FilmeCinematico {...props} />
}

/* ================== versão cinematográfica ================== */

function FilmeCinematico({ cenas, hero, ctaFinal, alturaPorCenaVh = 110 }: FilmeScrollProps) {
    const N = cenas.length
    const filmeRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const ctaFinalRef = useRef<HTMLDivElement>(null)
    const legendasRef = useRef<Array<HTMLDivElement | null>>([])
    const dotsRef = useRef<Array<HTMLSpanElement | null>>([])
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

        /* smooth scroll sincronizado com ScrollTrigger */
        const lenis = new Lenis({ lerp: 0.1 })
        lenis.on('scroll', ScrollTrigger.update)
        const tickLenis = (time: number) => lenis.raf(time * 1000)
        gsap.ticker.add(tickLenis)
        gsap.ticker.lagSmoothing(0)

        /* âncoras internas → lenis */
        const aoClicar = (e: MouseEvent) => {
            const alvo = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
            if (!alvo) return
            const el = document.querySelector(alvo.getAttribute('href')!)
            if (!el) return
            e.preventDefault()
            lenis.scrollTo(el as HTMLElement, { offset: -64 })
        }
        document.addEventListener('click', aoClicar)

        /* grão de filme */
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

        /* fotos das cenas (fallback) */
        const imagens: HTMLImageElement[] = cenas.map((c) => {
            const img = new Image()
            img.src = c.src
            return img
        })
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

        /* sequências de quadros dos clipes (scroll = tempo do filme) */
        const quadrosPorCena: Array<HTMLImageElement[] | null> = cenas.map(() => null)
        fetch('/filme/manifest.json')
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
                if (!m || destruido || !Array.isArray(m.cenas)) return
                for (const c of m.cenas) {
                    const i = Number(c.cena) - 1
                    if (i < 0 || i >= N || !c.quadros) continue
                    const passo = lite ? 2 : 1
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

        function desenharCena(i: number, t: number, alfa: number) {
            const e = smooth(t)

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

            const c = cenas[i]
            const img = imagens[i]
            if (!img.complete || img.naturalWidth === 0) return
            ctx.save()
            ctx.globalAlpha = alfa
            desenharCover(
                ctx,
                img,
                largura,
                altura,
                lerp(c.z0 ?? 1.12, c.z1 ?? 1.02, e),
                lerp(c.px0 ?? 0, c.px1 ?? 0, e),
                lerp(c.py0 ?? 0, c.py1 ?? 0, e)
            )
            ctx.restore()
        }

        function desenhar() {
            if (largura === 0 || altura === 0) return
            ctx.clearRect(0, 0, largura, altura)
            ctx.fillStyle = '#0b0b0f'
            ctx.fillRect(0, 0, largura, altura)

            const pos = clamp(progresso, 0, 0.9999) * N
            const i = Math.min(N - 1, Math.floor(pos))
            const t = pos - i

            desenharCena(i, t, 1)

            const inicioFade = 0.8
            if (t > inicioFade && i < N - 1) {
                const k = smooth((t - inicioFade) / (1 - inicioFade))
                desenharCena(i + 1, k * 0.12, k)
            }

            const cena = t > 0.9 && i < N - 1 ? cenas[i + 1] : cenas[i]
            desenharFeixe(cena.beamX ?? 0.6, cena.beamAngle ?? -0.3, cena.beamAlpha ?? 0.14)

            ctx.fillStyle = 'rgba(245, 185, 80, 0.05)'
            ctx.fillRect(0, 0, largura, altura)

            const v = ctx.createRadialGradient(
                largura / 2, altura / 2, Math.min(largura, altura) * 0.35,
                largura / 2, altura / 2, Math.max(largura, altura) * 0.75
            )
            v.addColorStop(0, 'rgba(8, 8, 12, 0)')
            v.addColorStop(1, 'rgba(8, 8, 12, 0.62)')
            ctx.fillStyle = v
            ctx.fillRect(0, 0, largura, altura)

            const b = ctx.createLinearGradient(0, altura, 0, altura * 0.45)
            b.addColorStop(0, 'rgba(8, 8, 12, 0.72)')
            b.addColorStop(1, 'rgba(8, 8, 12, 0)')
            ctx.fillStyle = b
            ctx.fillRect(0, 0, largura, altura)

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

        function atualizarOverlays() {
            const p = progresso
            const seg = 1 / N

            if (heroRef.current) {
                const a = 1 - janela(p, seg * 0.45, seg * 0.8)
                heroRef.current.style.opacity = String(a)
                heroRef.current.style.transform = `translateY(${(1 - a) * -28}px)`
                heroRef.current.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
            }

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

            if (ctaFinalRef.current) {
                const a = janela(p, 1 - seg * 0.42, 1 - seg * 0.18)
                ctaFinalRef.current.style.opacity = String(a)
                ctaFinalRef.current.style.transform = `translateY(${(1 - a) * 26}px)`
                ctaFinalRef.current.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
            }

            const ativo = Math.min(N - 1, Math.floor(p * N))
            dotsRef.current.forEach((d, i) => {
                if (!d) return
                d.style.backgroundColor = i === ativo ? '#f5b942' : 'rgba(255,255,255,0.28)'
                d.style.transform = i === ativo ? 'scale(1.5)' : 'scale(1)'
            })
        }

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
            document.removeEventListener('click', aoClicar)
            window.removeEventListener('resize', redimensionar)
            gsap.ticker.remove(tickLenis)
            gsap.ticker.remove(tickPintura)
            st.kill()
            lenis.destroy()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <section ref={filmeRef} aria-label="Apresentação" style={{ height: `${N * alturaPorCenaVh}vh` }}>
            <div className="sticky top-0 h-screen overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className={`h-full w-full transition-opacity duration-700 ${pronto ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden
                />

                {/* hero (cena 1) */}
                <div
                    ref={heroRef}
                    data-testid="hero"
                    className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                >
                    {hero}
                </div>

                {/* legendas */}
                {cenas.map((c, i) => (
                    <div
                        key={c.src + i}
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
                        {i === cenas.length - 1 && ctaFinal && (
                            <div
                                ref={ctaFinalRef}
                                data-testid="cta-final"
                                className="pointer-events-auto mt-6 flex justify-center opacity-0"
                            >
                                {ctaFinal}
                            </div>
                        )}
                    </div>
                ))}

                {/* capítulos */}
                <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2.5 sm:right-6" aria-hidden>
                    {cenas.map((c, i) => (
                        <span
                            key={c.src + i}
                            ref={(el) => { dotsRef.current[i] = el }}
                            className="h-1.5 w-1.5 rounded-full bg-white/30 transition-all duration-300"
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ================== versão estática (reduced motion) ================== */

function FilmeEstatico({ cenas, hero, ctaFinal }: FilmeScrollProps) {
    return (
        <section aria-label="Apresentação">
            <div className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={cenas[0].src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-transparent to-[#0e0e12]/70" />
                <div className="relative flex flex-col items-center">{hero}</div>
            </div>
            {cenas.slice(1).map((c, i) => (
                <figure key={c.src} className="relative mx-auto max-w-5xl px-4 py-10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt={c.titulo} className="w-full rounded-2xl object-cover" />
                    <figcaption className="mt-4 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-300/90">{c.kicker}</p>
                        <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: 'var(--font-outfit)' }}>{c.titulo}</h2>
                        <p className="mt-2 text-sm text-zinc-400">{c.texto}</p>
                        {i === cenas.length - 2 && ctaFinal && (
                            <div className="mt-5 flex justify-center">{ctaFinal}</div>
                        )}
                    </figcaption>
                </figure>
            ))}
        </section>
    )
}
