'use client';

import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'João Silva',
    role: 'Proprietário da Barbearia Moderna',
    content: 'O sistema revolucionou minha barbearia. Agora consigo gerenciar tudo de forma organizada e os clientes adoram a facilidade de agendar pelo app.',
    rating: 5,
  },
  {
    name: 'Maria Santos',
    role: 'Gerente da Barbearia Elite',
    content: 'Os relatórios me ajudam muito a entender o que está funcionando. Aumentei 40% nas vendas depois que comecei a usar o sistema.',
    rating: 5,
  },
  {
    name: 'Carlos Oliveira',
    role: 'Proprietário da Barbearia Clássica',
    content: 'A integração com WhatsApp é fantástica. Os clientes recebem lembretes automáticos e isso reduziu muito as faltas.',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            Mais de 500 barbearias já transformaram seus negócios com nossa plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-zinc-950 rounded-2xl p-8 border border-zinc-800 transition-all duration-300 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <blockquote className="text-zinc-300 mb-6">
                &ldquo;{testimonial.content}&rdquo;
              </blockquote>
              
              <div>
                <div className="font-semibold text-white">
                  {testimonial.name}
                </div>
                <div className="text-zinc-400 text-sm">
                  {testimonial.role}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <span className="text-sm font-medium">
              Veja mais depoimentos no nosso Instagram
            </span>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
