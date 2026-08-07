'use client'

import AvisoPlanoInativo from '@/components/shared/AvisoPlanoInativo'

/**
 * O convite de plano também no dashboard.
 *
 * O dashboard mora no grupo `(landing)`, e não em `(internas)` — que é onde o
 * convite está montado. O resultado é que ele aparecia em agendamentos, em
 * clientes, em finanças... e não aparecia justamente na PRIMEIRA tela que o
 * dono vê depois de entrar. Quem só olhasse o painel e saísse nunca era
 * convidado a escolher um plano.
 *
 * O componente decide sozinho se tem algo a dizer: para quem não é dono, ou
 * está com o plano em dia, ele não renderiza nada.
 */
export default function Layout(props: { children: React.ReactNode }) {
  return <AvisoPlanoInativo>{props.children}</AvisoPlanoInativo>
}
