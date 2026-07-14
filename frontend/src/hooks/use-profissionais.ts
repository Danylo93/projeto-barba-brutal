import { useState, useEffect } from 'react'
import useSessao from '@/data/hooks/useSessao'

export interface Profissional {
  id: number
  nome: string
  imagemUrl: string
}

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE

/**
 * Busca os profissionais reais do tenant do usuário autenticado.
 * Sem sessão (contexto público), retorna lista vazia.
 */
export function useProfissionais() {
  const { token } = useSessao()
  const [profissionais, setProfissionais] = useState<Profissional[]>([])

  useEffect(() => {
    if (!token) {
      setProfissionais([])
      return
    }

    let ativo = true
    fetch(`${URL_BASE}/profissionais`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((dados) => {
        if (!ativo) return
        setProfissionais(
          (Array.isArray(dados) ? dados : []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            imagemUrl: p.imagemUrl || '/avatar.png',
          }))
        )
      })
      .catch(() => ativo && setProfissionais([]))

    return () => {
      ativo = false
    }
  }, [token])

  return { profissionais }
}
