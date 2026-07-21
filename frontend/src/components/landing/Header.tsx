'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMenuOpen
          ? 'bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-lg shadow-black/40'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Barbearia Brutal"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold text-white">Barbearia Brutal</span>
            </Link>
          </motion.div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="#features" 
              className="text-zinc-300 hover:text-white transition-colors duration-200 relative group"
            >
              Recursos
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link 
              href="#pricing" 
              className="text-zinc-300 hover:text-white transition-colors duration-200 relative group"
            >
              Preços
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link
              href="#testimonials"
              className="text-zinc-300 hover:text-white transition-colors duration-200 relative group"
            >
              Depoimentos
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Começar Grátis</Link>
            </Button>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <button
              className="p-2 text-white"
              aria-label="Abrir menu"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-zinc-800">
                <nav className="flex flex-col space-y-1">
                  <Link
                    href="#features"
                    className="text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg px-3 py-3 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Recursos
                  </Link>
                  <Link
                    href="#pricing"
                    className="text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg px-3 py-3 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Preços
                  </Link>
                  <Link
                    href="#testimonials"
                    className="text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg px-3 py-3 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Depoimentos
                  </Link>
                  <div className="flex flex-col space-y-2 pt-4 px-3">
                    <Button variant="outline" asChild>
                      <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                        Entrar
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                        Começar Grátis
                      </Link>
                    </Button>
                  </div>
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
