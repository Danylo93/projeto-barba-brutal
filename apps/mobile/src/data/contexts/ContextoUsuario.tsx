'use client'
import { createContext, useCallback, useEffect, useState } from 'react'
import { Usuario } from '@barba/core'
import useLocalStorage from '../hooks/useLocalStorage'
import useAPI, { } from '@/src/data/hooks/useAPI'
import useSessao from '../hooks/useSessao'

export interface ContextoUsuarioProps {
    carregando: boolean
    usuario: Usuario | null
    entrar: (usuario: Usuario) => Promise<void>
    registrar: (usuario: Usuario) => Promise<void>
    sair: () => void
}

const ContextoUsuario = createContext<ContextoUsuarioProps>({} as any)

export function ProvedorUsuario({ children }: any) {
    const { get, set } = useLocalStorage()
    const { carregando,usuario, criarSessao, limparSessao } = useSessao()

    const { httpPost } = useAPI()

    
    
    async function entrar(usuario: Usuario) {
        const token = await httpPost('usuario/login', usuario)
        console.log('Token recebido:', token) // Verifique o token aqui
        if (!token) {
            console.error('Token de login é inválido:', token)
            return
        }
        criarSessao(token, usuario);  // Passando tanto o JWT quanto o usuário
    }
    
    

    async function registrar(usuario: Usuario) {
        await httpPost('usuario/registrar', usuario)
    }

    function sair() {
        limparSessao(),
        set('usuario', null)
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
