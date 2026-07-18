'use client'
import { useRouter } from 'next/navigation'
import { createContext } from 'react'
import { Usuario } from '@/lib/agendamento-utils'
import useSessao from '../hooks/useSessao'
import useAPI from '../hooks/useAPI'

export interface ContextoUsuarioProps {
    carregando: boolean
    usuario: Usuario | null
    entrar: (cred: { email: string; senha: string; tenantId?: number }) => Promise<void>
    registrar: (dados: { nome: string; email: string; senha: string; telefone: string }) => Promise<void>
    sair: () => void
}

const ContextoUsuario = createContext<ContextoUsuarioProps>({} as any)

export function ProvedorUsuario({ children }: any) {
    const { httpPost } = useAPI()
    const { carregando, usuario, criarSessao, limparSessao } = useSessao()
    const router = useRouter()

    async function entrar(cred: { email: string; senha: string; tenantId?: number }) {
        const tenantId = Number(process.env.NEXT_PUBLIC_TENANT_DEFAULT_ID || 1)
        const response = await httpPost('/auth/usuario/login', { ...cred, tenantId: cred.tenantId ?? tenantId })
        if (!response?.access_token) {
            throw new Error(response?.message || 'Email ou senha inválidos')
        }
        criarSessao(response.access_token)
    }

    async function registrar(dados: { nome: string; email: string; senha: string; telefone: string }) {
        const tenantId = Number(process.env.NEXT_PUBLIC_TENANT_DEFAULT_ID || 1)
        const response = await httpPost('/auth/usuario/register', {
            ...dados,
            barbeiro: false,
            tenantId,
        })
        if (!response?.access_token) {
            throw new Error(response?.message || 'Não foi possível criar a conta')
        }
        criarSessao(response.access_token)
    }

    function sair() {
        limparSessao()
        router.push('/')
    }

    return (
        <ContextoUsuario.Provider
            value={{
                carregando,
                usuario,
                entrar,
                registrar,
                sair,
            }}
        >
            {children}
        </ContextoUsuario.Provider>
    )
}

export default ContextoUsuario
