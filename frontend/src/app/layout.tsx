import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Barba Brutal SaaS - Sistema de Gestão para Barbearias',
    description: 'Transforme sua barbearia com nosso sistema completo de agendamentos, gestão de clientes e muito mais.',
    keywords: ['barbearia', 'agendamento', 'gestão', 'saas', 'sistema'],
    authors: [{ name: 'Danylo Oliveira' }],
    openGraph: {
        title: 'Barba Brutal SaaS',
        description: 'Sistema completo de gestão para barbearias',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    defaultTheme="system"
                    storageKey="barba-brutal-theme"
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    )
}
