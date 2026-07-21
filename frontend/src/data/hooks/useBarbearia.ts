import { useState, useEffect } from 'react'
import useUsuario from './useUsuario'
import useAPI from './useAPI'

export interface BarbeariaResumo {
    nome?: string
    telefone?: string
    email?: string
}

/**
 * Dados da barbearia (tenant) do usuário logado — nome e contato — para exibir
 * a marca correta nas telas do cliente/barbeiro/dono. O admin do SaaS não tem
 * tenant, então retorna null (mantém a marca do sistema).
 */
export default function useBarbearia(): BarbeariaResumo | null {
    const { usuario } = useUsuario()
    const { httpGet } = useAPI()
    const [barbearia, setBarbearia] = useState<BarbeariaResumo | null>(null)

    useEffect(() => {
        if (!usuario?.tenantId || usuario.tipo === 'admin') {
            setBarbearia(null)
            return
        }
        httpGet(`tenants/${usuario.tenantId}`)
            .then((t) => {
                if (t?.nome) {
                    setBarbearia({ nome: t.nome, telefone: t.telefone, email: t.email })
                }
            })
            .catch(() => {})
    }, [usuario?.tenantId, usuario?.tipo, httpGet])

    return barbearia
}
