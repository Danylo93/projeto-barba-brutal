import { useState, useEffect } from 'react'

export interface Servico {
  id: number
  nome: string
  preco: number
  duracao: number
  imagemURL: string
}

export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([])

  useEffect(() => {
    // Mock data - substituir por chamada real à API
    setServicos([
      {
        id: 1,
        nome: 'Corte de Cabelo',
        preco: 30,
        duracao: 30,
        imagemURL: '/servicos/corte-de-cabelo.jpg',
      },
      {
        id: 2,
        nome: 'Corte de Barba',
        preco: 20,
        duracao: 20,
        imagemURL: '/servicos/corte-de-barba.jpg',
      },
      {
        id: 3,
        nome: 'Combo',
        preco: 45,
        duracao: 50,
        imagemURL: '/servicos/combo.jpg',
      },
    ])
  }, [])

  return { servicos }
}

