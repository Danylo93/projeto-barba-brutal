'use client'

import Link from 'next/link'
import Logo from './Logo'
import MenuUsuario from './MenuUsuario'
import useUsuario from '@/data/hooks/useUsuario'

export default function MenuSuperior() {
    const { usuario } = useUsuario()

    return (
        <header className="self-stretch flex justify-center items-center h-24 bg-black/60">
            <nav className="flex items-center justify-between container">
                <Logo />
                <div className="flex items-center space-x-6">
                    <Link href="#features" className="text-white hover:text-gray-300 transition-colors">
                        Recursos
                    </Link>
                    <Link href="#pricing" className="text-white hover:text-gray-300 transition-colors">
                        Preços
                    </Link>
                    <Link href="#testimonials" className="text-white hover:text-gray-300 transition-colors">
                        Depoimentos
                    </Link>
                    {usuario ? (
                        <MenuUsuario usuario={usuario} />
                    ) : (
                        <div className="flex items-center space-x-4">
                            <Link 
                                href="/login" 
                                className="text-white hover:text-gray-300 transition-colors"
                            >
                                Entrar
                            </Link>
                            <Link 
                                href="/register" 
                                className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Começar Grátis
                            </Link>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    )
}
