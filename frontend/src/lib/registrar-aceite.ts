import { idDoVisitante } from './consentimento'

export const VERSAO_TERMOS = '2026-07-28'
export const VERSAO_PRIVACIDADE = '2026-07-28'

/**
 * Guarda a prova de que o titular aceitou os termos e a política no cadastro.
 *
 * A LGPD põe no controlador o ônus de comprovar o consentimento (art. 8º,
 * §1º) — o checkbox marcado na tela não prova nada depois que a página
 * fecha. O registro grava versão, data, IP e navegador.
 *
 * Roda depois do cadastro dar certo e nunca derruba o fluxo: se falhar, o
 * usuário já tem conta, e um erro aqui não pode barrar a entrada dele.
 */
export async function registrarAceiteDeTermos(token: string, tenantId?: number | null) {
    try {
        await fetch('/api-backend/lgpd/consentimento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                visitanteId: idDoVisitante(),
                tenantId: tenantId ?? undefined,
                consentimentos: [
                    { tipo: 'termos_de_uso', aceito: true, versao: VERSAO_TERMOS },
                    { tipo: 'politica_privacidade', aceito: true, versao: VERSAO_PRIVACIDADE },
                ],
            }),
        })
    } catch {
        /* melhor-esforço: não bloqueia o cadastro */
    }
}
