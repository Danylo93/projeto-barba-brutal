import { Metadata } from 'next';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import HomeFilme from './HomeFilme';

export const metadata: Metadata = {
  title: 'Barbearia Brutal SaaS - Sistema de Gestão para Barbearias',
  description: 'Transforme sua barbearia com nosso sistema completo de agendamentos, gestão de clientes e muito mais.',
  keywords: ['barbearia', 'agendamento', 'gestão', 'saas', 'sistema', 'barba brutal'],
  openGraph: {
    title: 'Barbearia Brutal SaaS',
    description: 'Sistema completo de gestão para barbearias',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main>
        {/* Filme de abertura controlado pela rolagem (motor FilmeScroll) */}
        <HomeFilme />
        <HowItWorks />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
