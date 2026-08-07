'use client'
import { useEffect } from 'react'
import useUsuario from '@/data/hooks/useUsuario'
import { useRouter } from 'next/navigation'

export default function Layout(props: { children: React.ReactNode }) {
    const { usuario } = useUsuario()
    const router = useRouter()

    // O redirecionamento sai do corpo do componente e vira efeito: mudar de
    // rota enquanto o React renderiza é proibido, e o `return router.push(...)`
    // ainda devolvia `void` no lugar da tela.
    useEffect(() => {
        if (usuario && !usuario.barbeiro) {
            router.push('/')
        }
    }, [usuario, router])

    if (!usuario || !usuario.barbeiro) {
        return null
    }

    return props.children
}
