import { Metadata } from 'next'
import ExperienciaBrutal from './ExperienciaBrutal'

// SEO local da barbearia (dados reais do sistema — tenant demo).
export const metadata: Metadata = {
    title: 'Barba Brutal Barbearia — Corte, Barba e Acabamento em São Paulo',
    description:
        'Barbearia em São Paulo: corte masculino, barba na navalha com toalha quente e acabamento completo. ' +
        'Rua das Flores, 123 — São Paulo/SP. Agende pelo WhatsApp ou online, seg a sáb das 08h às 21h.',
    keywords: [
        'barbearia são paulo',
        'corte masculino',
        'barba navalha',
        'degradê',
        'acabamento',
        'barbearia perto de mim',
        'barba brutal',
    ],
    openGraph: {
        title: 'Barba Brutal Barbearia',
        description:
            'Corte, barba e acabamento com hora marcada. Uma experiência cinematográfica — role e viva.',
        type: 'website',
        locale: 'pt_BR',
        images: [{ url: '/banners/principal.webp' }],
    },
}

export default function Page() {
    return <ExperienciaBrutal />
}
