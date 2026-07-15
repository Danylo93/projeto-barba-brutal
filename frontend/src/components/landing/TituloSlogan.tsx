'use client'
import Image from 'next/image'
import Link from 'next/link'
import MenuSuperior from '@/components/shared/MenuSuperior'

export default function TituloSlogan() {
    return (
        <div className="py-10 relative h-[700px]">
            <Image src="/banners/principal.webp" fill alt="Barbearia" className="object-cover" />
            <div
                className="
                    flex flex-col items-center
                    absolute top-0 left-0 w-full h-full
                    bg-black/80 md:bg-transparent md:bg-gradient-to-r from-black/30 via-black/90 to-black/30
                "
            >
                <MenuSuperior />
                <div className="container flex-1 flex flex-col justify-center items-center gap-5 z-50">
                    <h1 className="flex flex-col items-center">
                        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-thin tracking-wider">
                            Sistema de Gestão
                        </span>
                        <span className="text-gradient text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black pb-2">
                            para Barbearias
                        </span>
                    </h1>
                    <p className="w-full max-w-md text-center text-zinc-400 text-base sm:text-lg font-extralight">
                        🤘 Transforme sua barbearia em um negócio digital! 🤘
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/register"
                            className="
                                bg-gradient-to-r from-green-500 to-green-600
                                text-white font-semibold text-base md:text-lg
                                py-3 px-6 rounded-md hover:from-green-600 hover:to-green-700
                                transition-all duration-300
                            "
                        >
                            Começar Grátis
                        </Link>
                        <Link
                            href="/demo"
                            className="
                                bg-transparent border-2 border-white
                                text-white font-semibold text-base md:text-lg
                                py-3 px-6 rounded-md hover:bg-white hover:text-black
                                transition-all duration-300
                            "
                        >
                            Ver Demonstração
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
