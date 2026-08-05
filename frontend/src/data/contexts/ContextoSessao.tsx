'use client'
import { createContext, useCallback, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { Usuario } from '@/lib/agendamento-utils'
import cookie from 'js-cookie'

interface ContextoSessaoProps {
    carregando: boolean
    token: string | null
    usuario: Usuario | null
    criarSessao: (jwt: string) => void
    limparSessao: () => void
}

const ContextoSessao = createContext<ContextoSessaoProps>({} as any)

/**
 * Precisa bater com o `expiresIn` do token no backend (auth.module.ts).
 * Quando o cookie vence antes, a pessoa é deslogada com um token que ainda
 * valia — foi exatamente o que aconteceu com o valor antigo, de 1 dia.
 */
const DIAS_DE_SESSAO = 15

export function ProvedorSessao(props: any) {
    const nomeCookie = 'barba-authorization'

    const [carregando, setCarregando] = useState(true)
    const [token, setToken] = useState<string | null>(null)
    const [usuario, setUsuario] = useState<Usuario | null>(null)

    const carregarSessao = useCallback(function () {
        try {
            setCarregando(true)
            const estado = obterEstado()
            setToken(estado?.token ?? null)
            setUsuario(estado?.usuario ?? null)
        } finally {
            setCarregando(false)
        }
    }, [])

    useEffect(() => {
        carregarSessao()
    }, [carregarSessao])

    function criarSessao(jwt: string) {
        if (!jwt || typeof jwt !== 'string') return // nunca gravar cookie inválido
        const isDevelopment = process.env.NODE_ENV === 'development'
        cookie.set(nomeCookie, jwt, {
            // Tem que acompanhar o token, que dura 15 dias no backend. Estava
            // em 1 dia: no dia seguinte o cookie sumia e a pessoa era jogada
            // para o login mesmo com o token ainda válido — era isto que fazia
            // o login "não persistir".
            expires: DIAS_DE_SESSAO,
            // Lax basta: este cookie é lido pelo nosso próprio JavaScript e o
            // token vai no header Authorization, nunca sozinho numa requisição
            // de outro site. `None` deixava o cookie viajar em contexto de
            // terceiro sem necessidade nenhuma.
            sameSite: 'Lax',
            secure: !isDevelopment,
        })
        carregarSessao()
    }

    function limparSessao() {
        setToken(null)
        setUsuario(null)
        cookie.remove(nomeCookie)
    }

    function obterEstado(): { token: string; usuario: Usuario } | null {
        const jwt = cookie.get(nomeCookie)
        if (!jwt) return null

        try {
            // Sem console.log do token nem do conteúdo dele: qualquer script
            // na página lê o console, e ali ia a credencial inteira.
            const decoded: any = jwtDecode(jwt)

            const expired = decoded.exp < Date.now() / 1000
            if (expired) {
                cookie.remove(nomeCookie)
                return null
            }

            // Suportar tanto login de tenant quanto de usuário
            // Tenant: tipo='tenant', usuário: tipo='usuario'
            const usuario = {
                id: decoded.id,
                nome: decoded.nome || decoded.email, // Para tenant, usar email como nome
                email: decoded.email,
                barbeiro: decoded.barbeiro || false, // Para tenant, barbeiro é false
                tenantId: decoded.tenantId,
                tipo: decoded.tipo,
                profissional: decoded.profissionalId ? { id: decoded.profissionalId, nome: '' } : undefined,
            }
            return {
                token: jwt,
                usuario,
            }
        } catch {
            // Token ilegível é token inútil: limpa e manda para o login.
            cookie.remove(nomeCookie)
            return null
        }
    }

    return (
        <ContextoSessao.Provider
            value={{
                carregando,
                token,
                usuario,
                criarSessao,
                limparSessao,
            }}
        >
            {props.children}
        </ContextoSessao.Provider>
    )
}

export default ContextoSessao
