'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// A tela de login foi unificada em /login (aceita cliente, barbeiro,
// dono de barbearia e admin). Esta rota existe só para compatibilidade
// com links antigos.
function RedirecionarParaLogin() {
    const router = useRouter()
    const params = useSearchParams()

    useEffect(() => {
        // Repassa todos os parâmetros (destino, tenant da barbearia) para o /login.
        const qs = params.toString()
        router.replace(qs ? `/login?${qs}` : '/login')
    }, [router, params])

    return (
        <div className="flex justify-center items-center h-screen bg-zinc-950 text-zinc-400">
            Redirecionando para o login...
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={null}>
            <RedirecionarParaLogin />
        </Suspense>
    )
}
