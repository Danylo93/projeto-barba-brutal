import { useState } from 'react'
import { IconCalendar, IconTrash, IconCheck, IconChecks, IconClock, IconLock } from '@tabler/icons-react'
import {
    Agendamento,
    formatarDataEHora,
    duracaoTotal,
    emReais,
    valorDoAgendamento,
} from '@/lib/agendamento-utils'
import ConfirmModal from '@/components/shared/ConfirmModal'

export interface AgendaProfissionalItemProps {
    agendamento: Agendamento
    excluir: (id: number) => void
    atualizarStatus: (id: number, status: string) => void
}

export default function AgendaProfissionalItem(props: AgendaProfissionalItemProps) {
    const { agendamento } = props
    const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
    
    const dtInicio = new Date(agendamento.data)
    const totalMinutos = (agendamento.servicos ?? []).reduce((acc, s) => acc + (s.qtdeSlots ?? 1) * 30, 0)
    const dtFim = new Date(dtInicio.getTime() + totalMinutos * 60000)

    const isAgendado = agendamento.status === 'agendado'
    const isConfirmado = agendamento.status === 'confirmado'
    const isConcluido = agendamento.status === 'concluido'
    const isCancelado = agendamento.status === 'cancelado'
    const isRemarcado = agendamento.status === 'remarcado'
    const isAtivo = isAgendado || isConfirmado
    const isRiscado = isCancelado || isRemarcado

    return (
        <div
            aria-disabled={!isAtivo}
            className={`flex flex-col gap-6 rounded-md border-l-4 p-7 sm:flex-row sm:items-center ${
                isAtivo
                    ? 'border-l-emerald-400 bg-emerald-500/[0.06]'
                    : 'border-l-zinc-700 bg-zinc-900/70 opacity-60'
            }`}
        >
            <IconCalendar size={60} stroke={1} className={isConcluido ? 'text-green-500' : isConfirmado ? 'text-blue-500' : 'text-zinc-400'} />
            <div className={`flex flex-1 flex-col ${isRiscado ? 'line-through decoration-zinc-500' : ''}`}>
                <span className="text-[11px] uppercase tracking-wide text-zinc-500">Cliente</span>
                <span className="flex items-center gap-2 text-xl font-bold">{agendamento.usuario?.nome ?? 'Cliente'}</span>
                <span className="text-zinc-400 text-sm mt-1 flex items-center gap-2">
                    <IconClock size={16} />
                    {formatarDataEHora(dtInicio).split(' ')[1]} às {dtFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {(agendamento.servicos ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {(agendamento.servicos ?? []).map((servico, idx) => (
                            <span
                                key={idx}
                                className="bg-yellow-400/15 text-yellow-300 px-2 py-0.5 rounded text-xs"
                            >
                                {servico.nome}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className={`flex min-w-[120px] flex-col items-end sm:items-center ${isRiscado ? 'line-through decoration-zinc-500' : ''}`}>
                <span className="text-xl font-black">
                    {duracaoTotal(agendamento.servicos ?? [])}
                </span>
                <span className="text-zinc-400 font-semibold">
                    {emReais(valorDoAgendamento(agendamento))}
                </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 sm:mt-0">
                {isAtivo && (
                    <span className="mr-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Ativo
                    </span>
                )}
                {isConcluido && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs uppercase text-green-400">Concluído</span>}
                {isConfirmado && <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs uppercase text-blue-400">Confirmado</span>}
                {isCancelado && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs uppercase text-red-400">Cancelado</span>}
                {isRemarcado && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs uppercase text-red-400">Remarcado</span>}
                {isAgendado && (
                    <button 
                        className="button bg-blue-500 hover:bg-blue-600 flex items-center gap-1 px-4" 
                        onClick={() => props.atualizarStatus(agendamento.id, 'confirmado')}
                    >
                        <IconCheck size={20} />
                        <span className="hidden sm:inline">Confirmar</span>
                    </button>
                )}
                {isConfirmado && (
                    <button 
                        className="button bg-green-500 hover:bg-green-600 flex items-center gap-1 px-4" 
                        onClick={() => props.atualizarStatus(agendamento.id, 'concluido')}
                    >
                        <IconChecks size={20} />
                        <span className="hidden sm:inline">Concluir</span>
                    </button>
                )}
                {(isAgendado || isConfirmado) && (
                    <button 
                        className="button bg-red-500 hover:bg-red-600" 
                        onClick={() => setConfirmarCancelamento(true)}
                        title="Cancelar Agendamento"
                    >
                        <IconTrash size={24} stroke={1.5} />
                    </button>
                )}
                {!isAtivo && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <IconLock size={16} />
                        Bloqueado
                    </span>
                )}
            </div>

            <ConfirmModal
                aberto={confirmarCancelamento}
                titulo="Cancelar Agendamento"
                mensagem={`Tem certeza que deseja cancelar o agendamento de ${agendamento.usuario?.nome ?? 'Cliente'}?`}
                textoConfirmar="Cancelar Agendamento"
                onConfirmar={() => {
                    setConfirmarCancelamento(false)
                    props.excluir(agendamento.id)
                }}
                onCancelar={() => setConfirmarCancelamento(false)}
            />
        </div>
    )
}
