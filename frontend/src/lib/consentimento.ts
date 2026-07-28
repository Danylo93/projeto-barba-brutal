/**
 * Consentimento de cookies (LGPD).
 *
 * Regras que o código precisa respeitar, não são detalhe de implementação:
 * - Cookie essencial não entra na escolha: sem ele o sistema não funciona.
 * - Nada de análise ou marketing roda antes do "sim" explícito.
 * - Recusar tem que ser tão fácil quanto aceitar (um clique cada).
 * - A decisão é registrada no backend com data e versão, como prova.
 */

export const VERSAO_COOKIES = '2026-07-28'

const CHAVE = 'barba-brutal-consentimento'
const CHAVE_VISITANTE = 'barba-brutal-visitante'

export interface Consentimento {
    /** Sempre true: existe só para deixar explícito na interface. */
    essenciais: true
    analise: boolean
    marketing: boolean
    versao: string
    decididoEm: string
}

/** Identificador anônimo do navegador — não identifica a pessoa, só o aparelho. */
export function idDoVisitante(): string {
    if (typeof window === 'undefined') return ''
    let id = localStorage.getItem(CHAVE_VISITANTE)
    if (!id) {
        id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`
        localStorage.setItem(CHAVE_VISITANTE, id)
    }
    return id
}

export function lerConsentimento(): Consentimento | null {
    if (typeof window === 'undefined') return null
    try {
        const bruto = localStorage.getItem(CHAVE)
        if (!bruto) return null
        const c = JSON.parse(bruto) as Consentimento
        // Texto novo, escolha nova: a versão antiga não vale para a redação atual.
        if (c.versao !== VERSAO_COOKIES) return null
        return c
    } catch {
        return null
    }
}

export function gravarConsentimento(escolha: { analise: boolean; marketing: boolean }): Consentimento {
    const c: Consentimento = {
        essenciais: true,
        analise: escolha.analise,
        marketing: escolha.marketing,
        versao: VERSAO_COOKIES,
        decididoEm: new Date().toISOString(),
    }
    try {
        localStorage.setItem(CHAVE, JSON.stringify(c))
    } catch {
        // Navegador com armazenamento bloqueado: o banner reaparece na próxima
        // visita, o que é preferível a assumir um consentimento que não temos.
    }
    window.dispatchEvent(new CustomEvent('consentimento-alterado', { detail: c }))
    return c
}

/** Apaga a decisão para que o titular possa revê-la (direito de revogar). */
export function limparConsentimento() {
    try {
        localStorage.removeItem(CHAVE)
    } catch {
        /* nada a fazer */
    }
    window.dispatchEvent(new CustomEvent('consentimento-alterado', { detail: null }))
}

export function permite(finalidade: 'analise' | 'marketing'): boolean {
    return lerConsentimento()?.[finalidade] ?? false
}

/**
 * Manda a decisão para a API. Falha de rede não bloqueia o usuário: a escolha
 * já vale localmente e o registro é tentado de novo na próxima visita.
 */
export async function registrarNoServidor(
    c: Consentimento,
    opcoes: { tenantId?: number | null; token?: string | null } = {},
) {
    const corpo = {
        visitanteId: idDoVisitante(),
        tenantId: opcoes.tenantId ?? undefined,
        consentimentos: [
            { tipo: 'cookies_analise', aceito: c.analise, versao: c.versao },
            { tipo: 'cookies_marketing', aceito: c.marketing, versao: c.versao },
        ],
    }
    try {
        await fetch('/api-backend/lgpd/consentimento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
            },
            body: JSON.stringify(corpo),
        })
    } catch {
        /* registro é melhor-esforço; a escolha do usuário já foi respeitada */
    }
}
