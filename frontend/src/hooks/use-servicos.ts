import { useState, useEffect } from 'react'
import useSessao from '@/data/hooks/useSessao'
import { API_BASE } from '@/lib/api-base'

export interface Servico {
  id: number
  nome: string
  preco: number
  duracao: number
  qtdeSlots: number
  imagemURL: string
  ehCombo: boolean
}

const URL_BASE = API_BASE
const MINUTOS_POR_SLOT = 30

/**
 * Busca os serviços reais do tenant do usuário autenticado.
 * A duração é derivada de qtdeSlots (o backend não armazena duração).
 * Sem sessão (contexto público), retorna lista vazia.
 */
export function useServicos() {
  const { token } = useSessao()
  const [servicos, setServicos] = useState<Servico[]>([])

  useEffect(() => {
    if (!token) {
      setServicos([])
      return
    }

    let ativo = true
    fetch(`${URL_BASE}/servicos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((dados) => {
        if (!ativo) return
        setServicos(
          (Array.isArray(dados) ? dados : []).map((s: any) => ({
            id: s.id,
            nome: s.nome,
            preco: s.preco,
            qtdeSlots: s.qtdeSlots ?? 1,
            duracao: (s.qtdeSlots ?? 1) * MINUTOS_POR_SLOT,
            imagemURL: s.imagemURL || '/servicos/corte-de-cabelo.jpg',
            ehCombo: !!s.ehCombo,
          }))
        )
      })
      .catch(() => ativo && setServicos([]))

    return () => {
      ativo = false
    }
  }, [token])

  return { servicos }
}
