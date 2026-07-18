import { useState, useEffect } from 'react'
import useSessao from '@/data/hooks/useSessao'
import { API_BASE } from '@/lib/api-base'

export interface Profissional {
  id: number
  nome: string
  imagemUrl: string
  servicos: { id: number; nome?: string }[]
}

const URL_BASE = API_BASE

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
            servicos: Array.isArray(p.servicos)
              ? p.servicos.map((s: any) => ({ id: s.id, nome: s.nome }))
              : [],
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
