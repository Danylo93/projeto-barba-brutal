'use client'

import { useState, useEffect, useCallback } from 'react'
import useSessao from '@/data/hooks/useSessao'

export type TrialUrgencia = 'safe' | 'warning' | 'danger' | 'critical'

export interface TrialStatus {
  /** O tenant está em período de teste? */
  emTeste: boolean
  /** Dias restantes do trial */
  diasRestantes: number
  /** Total de dias do trial (30) */
  diasTotais: number
  /** Percentual do trial já usado (0-100) */
  percentualUsado: number
  /** Nível de urgência para cores/UI */
  urgencia: TrialUrgencia
  /** O trial já expirou? */
  expirado: boolean
  /** Data de fim do trial */
  dataFim: Date | null
  /** Data de início do trial */
  dataInicio: Date | null
  /** O banner foi ocultado pelo usuário? */
  ocultado: boolean
  /** Ocultar o banner por 24h */
  ocultarBanner: () => void
  /** Está carregando os dados? */
  carregando: boolean
  /** Status da assinatura (trialing, active, etc.) */
  statusAssinatura: string | null
}

const STORAGE_KEY = 'barba-trial-banner-hidden'
const HIDE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 horas

function calcularUrgencia(diasRestantes: number): TrialUrgencia {
  if (diasRestantes <= 2) return 'critical'
  if (diasRestantes <= 7) return 'danger'
  if (diasRestantes <= 15) return 'warning'
  return 'safe'
}

function isBannerHidden(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const hiddenUntil = parseInt(raw, 10)
    return Date.now() < hiddenUntil
  } catch {
    return false
  }
}

function hideBanner(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + HIDE_DURATION_MS))
  } catch {
    // silently fail
  }
}

export default function useTrialStatus(): TrialStatus {
  const { token, usuario } = useSessao()
  const [carregando, setCarregando] = useState(true)
  const [ocultado, setOcultado] = useState(false)
  const [assinatura, setAssinatura] = useState<any>(null)

  // Verificar se o banner está oculto via localStorage
  useEffect(() => {
    setOcultado(isBannerHidden())
  }, [])

  // Buscar dados de assinatura do tenant
  useEffect(() => {
    if (!token || usuario?.tipo !== 'tenant') {
      setCarregando(false)
      return
    }

    const fetchAssinatura = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL_BASE
        const resp = await fetch(`${baseUrl}/tenants/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resp.ok) {
          const data = await resp.json()
          setAssinatura(data?.assinatura ?? null)
        }
      } catch {
        // silently fail
      } finally {
        setCarregando(false)
      }
    }

    fetchAssinatura()
  }, [token, usuario?.tipo])

  const ocultarBanner = useCallback(() => {
    hideBanner()
    setOcultado(true)
  }, [])

  // Calcular status
  if (!assinatura || assinatura.status !== 'trialing') {
    return {
      emTeste: false,
      diasRestantes: 0,
      diasTotais: 30,
      percentualUsado: 0,
      urgencia: 'safe',
      expirado: false,
      dataFim: null,
      dataInicio: null,
      ocultado,
      ocultarBanner,
      carregando,
      statusAssinatura: assinatura?.status ?? null,
    }
  }

  const agora = new Date()
  const dataFim = new Date(assinatura.dataFim)
  const dataInicio = new Date(assinatura.dataInicio)
  const diffMs = dataFim.getTime() - agora.getTime()
  const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const diasTotais = Math.max(
    1,
    Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
  )
  const diasUsados = diasTotais - diasRestantes
  const percentualUsado = Math.min(100, Math.max(0, (diasUsados / diasTotais) * 100))
  const expirado = diasRestantes <= 0

  return {
    emTeste: true,
    diasRestantes,
    diasTotais,
    percentualUsado,
    urgencia: calcularUrgencia(diasRestantes),
    expirado,
    dataFim,
    dataInicio,
    ocultado,
    ocultarBanner,
    carregando,
    statusAssinatura: 'trialing',
  }
}
