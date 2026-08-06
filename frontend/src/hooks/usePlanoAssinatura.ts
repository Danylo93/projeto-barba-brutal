'use client'

import { useEffect, useMemo, useState } from 'react'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'

export type NomePlano = 'Básico' | 'Gratuito' | 'Profissional' | 'Premium' | string

export interface PlanoAssinatura {
  id: number | null
  nome: NomePlano
  descricao: string | null
  ativo: boolean
  carregando: boolean
  isBasico: boolean
  isProfissional: boolean
  isPremium: boolean
  emTeste: boolean
  planoId: number | null
}

export default function usePlanoAssinatura(): PlanoAssinatura {
  const { usuario } = useSessao()
  const { httpGet } = useAPI()
  const [carregando, setCarregando] = useState(true)
  const [assinatura, setAssinatura] = useState<any>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!usuario?.tenantId || usuario?.tipo !== 'tenant') {
        if (ativo) setCarregando(false)
        return
      }

      try {
        const data = await httpGet('tenants/me')
        if (ativo) setAssinatura(data?.assinatura ?? null)
      } catch {
        if (ativo) setAssinatura(null)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [httpGet, usuario?.tenantId, usuario?.tipo])

  const nome = assinatura?.plano?.nome ?? 'Básico'

  return useMemo(
    () => ({
      id: assinatura?.id ?? null,
      nome,
      descricao: assinatura?.plano?.descricao ?? null,
      ativo: assinatura?.status === 'active',
      carregando,
      isBasico: nome === 'Básico' || nome === 'Gratuito',
      isProfissional: nome === 'Profissional' || nome === 'Premium',
      isPremium: nome === 'Premium',
      emTeste: assinatura?.status === 'trialing',
      planoId: assinatura?.planoId ?? null,
    }),
    [assinatura, carregando, nome],
  )
}
