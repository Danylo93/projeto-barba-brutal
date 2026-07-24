import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { ToastProvider } from '@/components/ui/toast-provider'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
    display: 'swap',
    weight: ['300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
    title: 'Barbearia Brutal SaaS - Sistema de Gestão para Barbearias',
    description: 'Transforme sua barbearia com nosso sistema completo de agendamentos, gestão de clientes e muito mais.',
    keywords: ['barbearia', 'agendamento', 'gestão', 'saas', 'sistema'],
    authors: [{ name: 'Danylo Oliveira' }],
    openGraph: {
        title: 'Barbearia Brutal SaaS',
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
            <body className={`${inter.variable} ${outfit.variable} ${inter.className}`}>
                <ThemeProvider
                    defaultTheme="dark"
                    storageKey="barba-brutal-theme"
                >
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
