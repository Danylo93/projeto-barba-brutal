#!/usr/bin/env node
/**
 * Pipeline de quadros do filme da landing /barbabrutal.
 *
 * Converte clipes de vídeo (gerados no Higgsfield ou de qualquer origem) em
 * sequências de quadros JPEG que o canvas da página reproduz conforme a
 * rolagem (scroll = tempo do filme).
 *
 * Uso:
 *   1. Coloque os clipes em  frontend/filme/clipes/cena-1.mp4 ... cena-5.mp4
 *      (aceita .mp4, .webm e .mov; a ordem segue o número no nome)
 *   2. Rode:  npm run filme:quadros
 *   3. Os quadros vão para  frontend/public/filme/cena-N/q-XXX.jpg
 *      e o manifesto para   frontend/public/filme/manifest.json
 *   4. A página detecta o manifesto sozinha — nenhum código precisa mudar.
 *
 * ffmpeg: usa (nesta ordem) FFMPEG_PATH, o pacote ffmpeg-static (se instalado)
 * ou o ffmpeg do sistema.
 *
 * Opções (env):
 *   FILME_FPS=12       quadros por segundo extraídos (padrão 12)
 *   FILME_LARGURA=1600 largura dos quadros (padrão 1600, mantém proporção)
 *   FILME_QUALIDADE=4  qualidade JPEG do ffmpeg, 2(melhor)..7 (padrão 4)
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirClipes = join(raiz, 'filme', 'clipes')
const dirSaida = join(raiz, 'public', 'filme')

const FPS = Number(process.env.FILME_FPS || 12)
const LARGURA = Number(process.env.FILME_LARGURA || 1600)
const QUALIDADE = Number(process.env.FILME_QUALIDADE || 4)

function acharFfmpeg() {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH
    try {
        const mod = require('ffmpeg-static')
        if (mod) return mod
    } catch { /* opcional */ }
    return 'ffmpeg' // sistema
}

const ffmpeg = acharFfmpeg()
try {
    execFileSync(ffmpeg, ['-version'], { stdio: 'pipe' })
} catch {
    console.error(
        `✖ ffmpeg não encontrado ("${ffmpeg}").\n` +
        '  Instale no sistema (ex.: apt-get install ffmpeg) ou defina FFMPEG_PATH.'
    )
    process.exit(1)
}

if (!existsSync(dirClipes)) {
    mkdirSync(dirClipes, { recursive: true })
    console.log(
        `Pasta de clipes criada: ${dirClipes}\n` +
        'Coloque cena-1.mp4 ... cena-5.mp4 nela e rode de novo: npm run filme:quadros'
    )
    process.exit(0)
}

const clipes = readdirSync(dirClipes)
    .filter((f) => /^cena-\d+\.(mp4|webm|mov)$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

if (clipes.length === 0) {
    console.log(`Nenhum clipe encontrado em ${dirClipes} (esperado: cena-1.mp4, cena-2.mp4, ...).`)
    process.exit(0)
}

const manifesto = { fps: FPS, cenas: [] }

for (const clipe of clipes) {
    const numero = Number(clipe.match(/\d+/)[0])
    const pasta = `cena-${numero}`
    const destino = join(dirSaida, pasta)
    rmSync(destino, { recursive: true, force: true })
    mkdirSync(destino, { recursive: true })

    console.log(`→ ${clipe}  (${FPS} fps, ${LARGURA}px)`)
    execFileSync(
        ffmpeg,
        [
            '-i', join(dirClipes, clipe),
            '-vf', `fps=${FPS},scale=${LARGURA}:-2:flags=lanczos`,
            '-q:v', String(QUALIDADE),
            '-an',
            join(destino, 'q-%03d.jpg'),
        ],
        { stdio: 'pipe' }
    )

    const quadros = readdirSync(destino).filter((f) => f.endsWith('.jpg')).length
    manifesto.cenas.push({ cena: numero, pasta: `/filme/${pasta}`, quadros })
    console.log(`  ✓ ${quadros} quadros em public/filme/${pasta}/`)
}

writeFileSync(join(dirSaida, 'manifest.json'), JSON.stringify(manifesto, null, 2))
console.log(`\n✓ Manifesto: public/filme/manifest.json — a página /barbabrutal usa automaticamente.`)
