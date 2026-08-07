'use client'

import { useEffect, useMemo, useState } from 'react'
import useAPI from '@/data/hooks/useAPI'
import useSessao from '@/data/hooks/useSessao'
import { PRAZO_TESTE_GRATIS } from '@/lib/teste-gratis'

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
  erro: boolean
  status: string | null
  dataFim: string | null
  expirado: boolean
  bloqueado: boolean
}

export function chaveDoPlano(nome: unknown) {
  return String(nome ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function usePlanoAssinatura(): PlanoAssinatura {
  const { usuario } = useSessao()
  const { httpGet } = useAPI()
  const [carregando, setCarregando] = useState(true)
  const [assinatura, setAssinatura] = useState<any>(null)
  const [erro, setErro] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const relogio = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(relogio)
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!usuario?.tenantId || usuario?.tipo !== 'tenant') {
        if (ativo) setCarregando(false)
        return
      }

      try {
        if (ativo) setErro(false)
        const data = await httpGet('tenants/me')
        if (ativo) {
          const recebida = data?.assinatura ?? null
          setAssinatura(recebida)
          // Barbearia SEM assinatura não é erro de leitura: é o estado normal
          // de quem acabou de se cadastrar e ainda não escolheu plano — que é
          // exatamente quem chega por anúncio. Marcando isso como erro, o
          // convite para escolher um plano nunca aparecia justamente para
          // ela. Erro aqui é só o que impediu a resposta de chegar.
          setErro(false)
        }
      } catch {
        if (ativo) {
          setAssinatura(null)
          setErro(true)
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [httpGet, usuario?.tenantId, usuario?.tipo])

  const nomeContratado = String(
    assinatura?.plano?.nome ?? (carregando ? 'Carregando...' : 'Indisponível'),
  ).trim()
  const status = assinatura?.status ? String(assinatura.status) : null
  const dataFim = assinatura?.dataFim ? String(assinatura.dataFim) : null
  const dataFimMs = dataFim ? new Date(dataFim).getTime() : Number.NaN
  const expirado = Number.isFinite(dataFimMs) && dataFimMs <= agora
  const emTeste = status === 'trialing' && !expirado
  const nome = emTeste ? 'Premium' : nomeContratado
  const chave = chaveDoPlano(nome)
  const statusAtivo = ['active', 'trialing'].includes(status ?? '')
  const planoDisponivel = emTeste || assinatura?.plano?.ativo !== false
  const assinaturaAtiva = statusAtivo && !expirado && planoDisponivel
  const ehTenant = usuario?.tipo === 'tenant' && !!usuario?.tenantId
  // Sem assinatura nenhuma também é plano inativo — e é o caso mais comum de
  // todos logo depois do cadastro.
  const bloqueado = ehTenant && !erro && !assinaturaAtiva

  return useMemo(
    () => ({
      id: assinatura?.id ?? null,
      nome,
      descricao: emTeste
        ? `Acesso Premium liberado durante os ${PRAZO_TESTE_GRATIS} de teste grátis.`
        : assinatura?.plano?.descricao ?? null,
      ativo: assinaturaAtiva,
      carregando,
      isBasico: assinaturaAtiva && (chave === 'basico' || chave === 'gratuito'),
      isProfissional: assinaturaAtiva && (chave === 'profissional' || chave === 'premium'),
      isPremium: assinaturaAtiva && chave === 'premium',
      emTeste,
      planoId: assinatura?.planoId ?? null,
      erro,
      status,
      dataFim,
      expirado,
      bloqueado,
    }),
    [assinatura, assinaturaAtiva, bloqueado, carregando, chave, dataFim, emTeste, erro, expirado, nome, status],
  )
}
