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
        const destino = params.get('destino')
        router.replace(destino ? `/login?destino=${encodeURIComponent(destino)}` : '/login')
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
