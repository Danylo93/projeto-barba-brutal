'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Star } from 'lucide-react'
import Link from 'next/link'
import { PRAZO_TESTE_GRATIS } from '@/lib/teste-gratis'
import {
  agruparPlanos,
  economiaNoAno,
  equivalenteMensal,
  mesesDeGraca,
  PlanoAgrupado,
  PlanoDaApi,
  Periodicidade,
  planoEscolhido,
  reais,
} from '@/lib/planos'

/**
 * Os preços vêm da API.
 *
 * Estavam escritos aqui dentro, e por um tempo esta seção anunciou R$ 49,90
 * para um plano que o checkout cobrava R$ 99,90. Preço em dois lugares vira
 * duas verdades, e a que o cliente lembra é a da vitrine.
 */
const CARTAO_EM_DESTAQUE = 'profissional'

export function Pricing() {
  const [planos, setPlanos] = useState<PlanoDaApi[]>([])
  const [carregando, setCarregando] = useState(true)
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')

  useEffect(() => {
    let vivo = true
    fetch('/api/planos')
      .then((r) => (r.ok ? r.json() : []))
      .then((dados) => {
        if (vivo) setPlanos(Array.isArray(dados) ? dados : [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  const cartoes = useMemo(() => agruparPlanos(planos), [planos])
  const temAnual = cartoes.some((c) => c.anual)

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-gradient-to-b from-zinc-950 to-background px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Planos claros para a operação real
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-zinc-400">
            Básico para quem trabalha sozinho, Profissional para equipe e robô de WhatsApp,
            Premium para quem não quer horário furado.
          </p>
        </div>

        {temAnual && (
          <AlternadorDePeriodo valor={periodicidade} aoMudar={setPeriodicidade} />
        )}

        {carregando ? (
          <p className="text-center text-zinc-500">Carregando os planos…</p>
        ) : cartoes.length === 0 ? (
          <p className="text-center text-zinc-500">
            Não conseguimos carregar os planos agora.{' '}
            <Link href="/contact" className="text-yellow-400 underline">
              Fale com a gente
            </Link>{' '}
            que a gente passa os valores.
          </p>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {cartoes.map((cartao) => (
              <Cartao
                key={cartao.chave}
                cartao={cartao}
                periodicidade={periodicidade}
                destaque={cartao.chave === CARTAO_EM_DESTAQUE}
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="mb-4 text-zinc-400">
            Todos os planos incluem{' '}
            <span className="font-semibold text-yellow-400">{PRAZO_TESTE_GRATIS} grátis</span> ·
            pagamento via Pix
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-500">
            <span>✓ Sem taxa de instalação</span>
            <span>✓ Cancelamento a qualquer momento</span>
            <span>✓ Migração de dados gratuita</span>
            <span>✓ Suporte técnico incluso</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function AlternadorDePeriodo({
  valor,
  aoMudar,
}: {
  valor: Periodicidade
  aoMudar: (p: Periodicidade) => void
}) {
  return (
    <div className="mb-12 flex justify-center">
      <div
        role="radiogroup"
        aria-label="Como você quer pagar"
        className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 p-1"
      >
        {(['mensal', 'anual'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            role="radio"
            aria-checked={valor === opcao}
            onClick={() => aoMudar(opcao)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              valor === opcao
                ? 'bg-yellow-400 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {opcao === 'mensal' ? 'Mensal' : 'Anual'}
            {opcao === 'anual' && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  valor === opcao ? 'bg-zinc-900/15 text-zinc-900' : 'bg-green-500/10 text-green-400'
                }`}
              >
                2 meses grátis
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function Cartao({
  cartao,
  periodicidade,
  destaque,
}: {
  cartao: PlanoAgrupado
  periodicidade: Periodicidade
  destaque: boolean
}) {
  const plano = planoEscolhido(cartao, periodicidade)
  if (!plano) return null

  const ehAnual = periodicidade === 'anual' && !!cartao.anual
  const economia = economiaNoAno(cartao)
  const meses = mesesDeGraca(cartao)

  return (
    <div
      className={`relative rounded-2xl border-2 p-8 transition-all duration-300 hover:-translate-y-1.5 ${
        destaque
          ? 'border-yellow-400 bg-zinc-900 shadow-xl hover:shadow-[0_12px_40px_rgba(250,204,21,0.12)]'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/40'
      }`}
    >
      {destaque && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
          <div className="flex items-center rounded-full bg-yellow-400 px-4 py-2 text-sm font-medium text-zinc-900">
            <Star className="mr-1 h-4 w-4" />
            Mais escolhido
          </div>
        </div>
      )}

      <div className="mb-8 text-center">
        <h3 className="mb-2 text-2xl font-bold text-white">{cartao.nome}</h3>
        <p className="mb-4 text-zinc-400">{cartao.descricao}</p>

        <div className="flex items-baseline justify-center">
          {/*
            No anual, o número grande é o EQUIVALENTE MENSAL. "R$ 699" ao lado
            de "R$ 69,90" faz o plano mais barato parecer dez vezes mais caro.
          */}
          <span className="text-4xl font-bold text-white">
            {reais(ehAnual ? equivalenteMensal(plano.preco) : plano.preco)}
          </span>
          <span className="ml-1 text-zinc-400">/mês</span>
        </div>

        {ehAnual && (
          <p className="mt-2 text-sm text-zinc-500">
            {reais(plano.preco)} por ano
            {economia > 0 && (
              <>
                {' · '}
                <span className="text-green-400">
                  economiza {reais(economia)}
                  {meses > 0 && ` (${meses} ${meses === 1 ? 'mês' : 'meses'})`}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      <ul className="mb-8 space-y-4">
        {cartao.features.map((feature) => (
          <li key={feature} className="flex items-start">
            <Check className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
            <span className="text-zinc-400">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className={`w-full ${destaque ? 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300' : ''}`}
        variant={destaque ? 'default' : 'outline'}
        asChild
      >
        {/* O id vai junto: é ele que diz mensal ou anual no cadastro. */}
        <Link href={`/register?plano=${cartao.chave}&planoId=${plano.id}`}>Começar agora</Link>
      </Button>
    </div>
  )
}
