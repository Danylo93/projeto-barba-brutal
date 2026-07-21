import { useState } from 'react'
import { IconCalendar, IconTrash, IconCheck, IconChecks, IconClock } from '@tabler/icons-react'
import { Agendamento, formatarDataEHora, duracaoTotal } from '@/lib/agendamento-utils'
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

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-zinc-800 rounded-md p-7">
            <IconCalendar size={60} stroke={1} className={isConcluido ? 'text-green-500' : isConfirmado ? 'text-blue-500' : 'text-zinc-400'} />
            <div className="flex-1 flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500">Cliente</span>
                <span className="text-xl font-bold flex items-center gap-2">
                    {agendamento.usuario?.nome ?? 'Cliente'}
                    {isConcluido && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full uppercase">Concluído</span>}
                    {isConfirmado && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full uppercase">Confirmado</span>}
                </span>
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
            <div className="flex flex-col items-end sm:items-center min-w-[120px]">
                <span className="text-xl font-black">
                    {duracaoTotal(agendamento.servicos ?? [])}
                </span>
                <span className="text-zinc-400 font-semibold">
                    R$ {(agendamento.servicos ?? []).reduce((acc, servico) => acc + (servico.preco ?? 0), 0).toFixed(2)}
                </span>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0 justify-end">
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
                {!isConcluido && (
                    <button 
                        className="button bg-red-500 hover:bg-red-600" 
                        onClick={() => setConfirmarCancelamento(true)}
                        title="Cancelar Agendamento"
                    >
                        <IconTrash size={24} stroke={1.5} />
                    </button>
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
