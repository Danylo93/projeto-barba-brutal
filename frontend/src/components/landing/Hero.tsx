'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Star, Users, Calendar, Shield, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/banners/principal.webp"
          alt="Barbearia moderna"
          fill
          priority
          className="object-cover opacity-20 dark:opacity-10"
          quality={90}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-primary/20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6"
          >
            Transforme sua{' '}
            <span className="text-gradient">
              barbearia
            </span>{' '}
            em um negócio digital
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto"
          >
            Sistema completo de gestão para barbearias. Agendamentos online, 
            gestão de clientes, relatórios e muito mais em uma única plataforma.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Button size="lg" asChild className="text-lg px-8 py-6 group">
              <Link href="/register">
                Sou dono — Começar Grátis
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 group">
              <Link href="/login?destino=/agendamento">
                <CalendarClock className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Quero agendar um horário
              </Link>
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            <motion.div 
              className="text-center card-hover p-4 rounded-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="text-3xl font-bold text-foreground mb-2">500+</div>
              <div className="text-muted-foreground">Barbearias Ativas</div>
            </motion.div>
            <motion.div 
              className="text-center card-hover p-4 rounded-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="text-3xl font-bold text-foreground mb-2">50K+</div>
              <div className="text-muted-foreground">Agendamentos/Mês</div>
            </motion.div>
            <motion.div 
              className="text-center card-hover p-4 rounded-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="text-3xl font-bold text-foreground mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </motion.div>
            <motion.div 
              className="text-center card-hover p-4 rounded-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-1">
                4.9<Star className="h-6 w-6 text-yellow-500 fill-current" />
              </div>
              <div className="text-muted-foreground">Avaliação</div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-20"
        >
          <div className="relative rounded-2xl glass-effect p-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-2xl"></div>
            <div className="relative">
              <h3 className="text-2xl font-bold text-foreground mb-4 text-center">
                Veja o sistema em ação
              </h3>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center group cursor-pointer">
                <div className="text-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4 group-hover:text-primary transition-colors" />
                  </motion.div>
                  <p className="text-muted-foreground">Demonstração do Sistema</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div 
            className="text-center p-6 rounded-lg bg-card border"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Gestão de Clientes</h4>
            <p className="text-muted-foreground">Organize e acompanhe todos os seus clientes em um só lugar</p>
          </motion.div>
          
          <motion.div 
            className="text-center p-6 rounded-lg bg-card border"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Agendamentos Online</h4>
            <p className="text-muted-foreground">Sistema completo de agendamentos com confirmação automática</p>
          </motion.div>
          
          <motion.div 
            className="text-center p-6 rounded-lg bg-card border"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Segurança Total</h4>
            <p className="text-muted-foreground">Seus dados protegidos com criptografia de nível bancário</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
