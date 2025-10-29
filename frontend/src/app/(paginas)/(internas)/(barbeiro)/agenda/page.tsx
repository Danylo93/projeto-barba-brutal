'use client'
import { IconCalendarCancel } from '@tabler/icons-react'
import useProfissionalAgenda from '@/data/hooks/useProfissionalAgenda'
import DiaInput from '@/components/agendamento/DiaInput'
import Cabecalho from '@/components/shared/Cabecalho'
import AgendaProfissionalItem from '@/components/agendamento/AgendaProfissionalItem'

export default function PaginaAgenda() {
    const { data, agendamentos, alterarData, excluirAgendamento } = useProfissionalAgenda()

    return (
        <div className="flex flex-col bg-zinc-900">
            <Cabecalho titulo="Minha Agenda" descricao="Veja e gerencie seus agendamentos." />
            <div className="container flex flex-col gap-10 py-16">
                <DiaInput data={data} dataMudou={alterarData} />
                {agendamentos.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {agendamentos.map((agendamento) => (
                            <AgendaProfissionalItem
                                key={agendamento.id}
                                agendamento={agendamento}
                                excluir={excluirAgendamento}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <IconCalendarCancel size={150} stroke={0.5} className="text-zinc-400" />
                        <span className="text-xl text-zinc-500 font-extralight w-64 text-center">
                            Nenhum agendamento para esta data.
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
