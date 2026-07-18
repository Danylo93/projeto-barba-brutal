'use client'
import { usePathname, useRouter } from 'next/navigation'
import useUsuario from '@/data/hooks/useUsuario'

export default function ForcarUsuario(props: any) {
    const { carregando, usuario } = useUsuario()
    const caminho = usePathname()
    const router = useRouter()

    function redirecionarPara(url: string) {
        router.push(url)
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-800 border-t-yellow-400"></div>
                <p className="text-zinc-400 mt-4 text-sm">Direcionando...</p>
            </div>
        )
    }

    if (!usuario?.email && carregando) return (
        <div className="flex flex-col justify-center items-center h-screen bg-zinc-950">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-800 border-t-yellow-400"></div>
            <p className="text-zinc-400 mt-4 text-sm">Carregando...</p>
        </div>
    )
    if (!usuario?.email) return redirecionarPara(`/login?destino=${encodeURIComponent(caminho)}`)

    return props.children
}
