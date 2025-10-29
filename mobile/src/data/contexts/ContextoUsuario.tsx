'use client'
import { createContext, useCallback, useEffect, useState } from 'react'
import { Usuario } from '@barba/core'
import useLocalStorage from '../hooks/useLocalStorage'

export interface Tenant {
    id: number
    nome: string
    email: string
    telefone: string
    endereco?: string
    cnpj?: string
    ativo: boolean
}

export interface ContextoUsuarioProps {
    carregando: boolean
    usuario: Usuario | null
    tenant: Tenant | null
    token: string | null
    entrar: (usuario: Usuario, tenant: Tenant, token: string) => Promise<void>
    sair: () => void
}

const ContextoUsuario = createContext<ContextoUsuarioProps>({} as any)

export function ProvedorUsuario({ children }: any) {
    const { get, set } = useLocalStorage()
    const [carregando, setCarregando] = useState(true)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [token, setToken] = useState<string | null>(null)

    const carregarUsuario = useCallback(
        async function () {
            try {
                const [usuarioLocal, tenantLocal, tokenLocal] = await Promise.all([
                    get('usuario'),
                    get('tenant'),
                    get('token'),
                ])
                
                if (usuarioLocal && tenantLocal && tokenLocal) {
                    setUsuario(usuarioLocal)
                    setTenant(tenantLocal)
                    setToken(tokenLocal)
                }
            } finally {
                setCarregando(false)
            }
        },
        [get]
    )

    async function entrar(usuario: Usuario, tenant: Tenant, token: string) {
        setUsuario(usuario)
        setTenant(tenant)
        setToken(token)
        
        await Promise.all([
            set('usuario', usuario),
            set('tenant', tenant),
            set('token', token),
        ])
    }

    function sair() {
        setUsuario(null)
        setTenant(null)
        setToken(null)
        
        set('usuario', null)
        set('tenant', null)
        set('token', null)
    }

    useEffect(() => {
        carregarUsuario()
    }, [carregarUsuario])

    return (
        <ContextoUsuario.Provider
            value={{
                carregando,
                usuario,
                tenant,
                token,
                entrar,
                sair,
            }}
        >
            {children}
        </ContextoUsuario.Provider>
    )
}

export default ContextoUsuario
