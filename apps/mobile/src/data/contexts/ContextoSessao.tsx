import React, { createContext, useCallback, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { Usuario } from '@barba/core'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ContextoSessaoProps {
    carregando: boolean
    token: string | null
    usuario: Usuario | null
    criarSessao: (jwt: string, usuario: Usuario) => void  // Ajustar aqui
    limparSessao: () => void
}


const ContextoSessao = createContext<ContextoSessaoProps>({} as any)

export function ProvedorSessao(props: any) {
    const nomeStorage = 'barba-authorization'

    const [carregando, setCarregando] = useState(true)
    const [token, setToken] = useState<string | null>(null)
    const [usuario, setUsuario] = useState<Usuario | null>(null)

    const carregarSessao = useCallback(async function () {
        try {
            setCarregando(true)
            const estado = await obterEstado()
            setToken(estado?.token ?? null)
            setUsuario(estado?.usuario ?? null)
        } finally {
            setCarregando(false)
        }
    }, [])

    useEffect(() => {
        carregarSessao()
    }, [carregarSessao])

    // Função para remover referências circulares
    function removerReferenciasCiclicas(obj: any) {
        const seen = new Set();
        return JSON.parse(
            JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return; // Ignora a referência cíclica
                    }
                    seen.add(value);
                }
                return value;
            })
        );
    }
    
    async function criarSessao(jwt: string, usuario: Usuario) {
        await AsyncStorage.setItem(nomeStorage, jwt);
        setUsuario(usuario);  // Atualiza o estado do usuário
        setToken(jwt);        // Atualiza o estado do token
        carregarSessao();     // Carrega a sessão
    }
    
    
    

    async function limparSessao() {
        setToken(null)
        setUsuario(null)
        await AsyncStorage.removeItem(nomeStorage)
    }

    async function obterEstado(): Promise<{ token: string; usuario: Usuario } | null> {
        const jwt = await AsyncStorage.getItem(nomeStorage)
        if (!jwt) return null

        try {
            const decoded: any = jwtDecode(jwt)
            const expired = decoded.exp < Date.now() / 1000
            if (expired) {
                await AsyncStorage.removeItem(nomeStorage)
                return null
            }

            return {
                token: jwt,
                usuario: {
                    id: decoded.id,
                    nome: decoded.nome,
                    email: decoded.email,
                    barbeiro: decoded.barbeiro,
                },
            }
        } catch (error) {
            await AsyncStorage.removeItem(nomeStorage)
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
