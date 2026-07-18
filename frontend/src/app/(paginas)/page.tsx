import { Metadata } from 'next';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header />
      <main>
        <Hero />
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
