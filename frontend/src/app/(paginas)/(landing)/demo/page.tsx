'use client'

import Link from 'next/link'
import { ArrowRight, Calendar, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react'

const agenda = [
  { horario: '08:00', cliente: 'Carlos Henrique', servico: 'Corte + Barba', status: 'Confirmado' },
  { horario: '09:30', cliente: 'Marcos Vinicius', servico: 'Corte Masculino', status: 'Confirmado' },
  { horario: '11:00', cliente: 'Lucas Andrade', servico: 'Barba', status: 'Pendente' },
]

const clientes = [
  { nome: 'Carlos Henrique', visitas: 18, origem: 'WhatsApp' },
  { nome: 'Marcos Vinicius', visitas: 11, origem: 'Agendamento online' },
  { nome: 'Lucas Andrade', visitas: 7, origem: 'Retorno automático' },
]

const recursos = [
  'Agenda online com horários disponíveis',
  'Cadastro de clientes e histórico',
  'Controle de serviços e preços',
  'Finanças e relatórios por plano',
  'Integração com WhatsApp e Evolution API',
  'Fluxo de agendamento real no n8n',
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                <Sparkles size={14} />
                Demonstração real do sistema
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Veja a operação do jeito que ela funciona de verdade.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-zinc-300 sm:text-base">
                Esta demo mostra o fluxo real da plataforma: agendamentos, clientes, serviços, financeiro e a integração com WhatsApp/Evolution API que leva as mensagens para o n8n e volta para o cliente.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-yellow-300"
              >
                Começar grátis
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                Ir para o painel
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center gap-3">
              <Calendar className="text-yellow-400" size={22} />
              <h2 className="text-xl font-bold">Agenda do dia</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-[0.18em] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Horário</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Serviço</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                  {agenda.map((item) => (
                    <tr key={`${item.horario}-${item.cliente}`} className="text-sm">
                      <td className="px-4 py-4 font-semibold text-white">{item.horario}</td>
                      <td className="px-4 py-4 text-zinc-300">{item.cliente}</td>
                      <td className="px-4 py-4 text-zinc-400">{item.servico}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.status === 'Confirmado'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center gap-3">
              <MessageSquare className="text-yellow-400" size={22} />
              <h2 className="text-xl font-bold">Fluxo de atendimento</h2>
            </div>
            <div className="space-y-4 text-sm text-zinc-300">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                Cliente envia mensagem no WhatsApp
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                Evolution API recebe e repassa para o n8n
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                Robô identifica se é agendar, reagendar ou cancelar
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                Backend valida o plano, salva no sistema e avisa cliente + barbeiro
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center gap-3">
              <Users className="text-yellow-400" size={22} />
              <h2 className="text-xl font-bold">Clientes ativos</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {clientes.map((cliente) => (
                <div key={cliente.nome} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="font-semibold text-white">{cliente.nome}</p>
                  <p className="mt-1 text-sm text-zinc-400">{cliente.visitas} visitas</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{cliente.origem}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center gap-3">
              <Wallet className="text-yellow-400" size={22} />
              <h2 className="text-xl font-bold">Resumo da operação</h2>
            </div>
            <div className="space-y-4">
              {recursos.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-zinc-300">
              <div className="flex items-center gap-2 font-semibold text-yellow-300">
                <ShieldCheck size={16} />
                Demo honesta
              </div>
              <p className="mt-2">
                A demonstração mostra o comportamento real do sistema. Se um recurso for de plano superior, ele aparece bloqueado do mesmo jeito que acontece na aplicação.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Próximo passo</p>
          <h2 className="mt-2 text-2xl font-black">Quer testar com dados reais da sua barbearia?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-300">
            Crie sua conta e conecte a barbearia ao WhatsApp, Evolution API e n8n para operar de ponta a ponta.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-yellow-300"
            >
              Criar conta
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/integrations"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/70 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Ver integrações
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
