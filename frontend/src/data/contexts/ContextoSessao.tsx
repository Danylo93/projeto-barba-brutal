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
            expires: 1,
            sameSite: isDevelopment ? 'Lax' : 'None',
            secure: !isDevelopment,
        })
        console.log('✅ Cookie criado:', nomeCookie)
        console.log('✅ JWT:', jwt.substring(0, 50) + '...')
        carregarSessao()
    }

    function limparSessao() {
        setToken(null)
        setUsuario(null)
        cookie.remove(nomeCookie)
    }

    function obterEstado(): { token: string; usuario: Usuario } | null {
        const jwt = cookie.get(nomeCookie)
        if (!jwt) {
            console.log('❌ Nenhum JWT encontrado no cookie')
            return null
        }

        try {
            const decoded: any = jwtDecode(jwt)
            console.log('✅ JWT decodificado:', decoded)

            const expired = decoded.exp < Date.now() / 1000
            if (expired) {
                console.log('❌ JWT expirado')
                cookie.remove(nomeCookie)
                return null
            }

            // Suportar tanto login de tenant quanto de usuário
            // Tenant: tipo='tenant', usuário: tipo='usuario'
            const isTenant = decoded.tipo === 'tenant'
            console.log('✅ É tenant?', isTenant)

            const usuario = {
                id: decoded.id,
                nome: decoded.nome || decoded.email, // Para tenant, usar email como nome
                email: decoded.email,
                barbeiro: decoded.barbeiro || false, // Para tenant, barbeiro é false
                tenantId: decoded.tenantId,
                tipo: decoded.tipo,
            }
            console.log('✅ Usuário extraído:', usuario)

            return {
                token: jwt,
                usuario,
            }
        } catch (error) {
            console.error('❌ Erro ao decodificar JWT:', error)
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
