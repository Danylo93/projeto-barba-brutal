import { useState, useEffect } from 'react'

export interface Profissional {
  id: number
  nome: string
  imagemUrl: string
}

export function useProfissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])

  useEffect(() => {
    // Mock data - substituir por chamada real à API
    setProfissionais([
      {
        id: 1,
        nome: 'Carlos Silva',
        imagemUrl: '/profissionais/profissional-1.jpg',
      },
      {
        id: 2,
        nome: 'João Santos',
        imagemUrl: '/profissionais/profissional-2.jpg',
      },
      {
        id: 3,
        nome: 'Miguel Costa',
        imagemUrl: '/profissionais/profissional-3.jpg',
      },
    ])
  }, [])

  return { profissionais }
}

