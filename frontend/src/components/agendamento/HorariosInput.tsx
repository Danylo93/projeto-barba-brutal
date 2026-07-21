import { useState } from 'react'
import { cn } from '@/lib/utils'
import { IconX } from '@tabler/icons-react'
import { horariosDoDia, aplicarHorario } from '@/lib/agendamento-utils'
import useAgendamento from '@/data/hooks/useAgendamento'

export interface HorariosInputProps {
    data: Date
    qtdeHorarios: number
    dataMudou(data: Date): void
}

export default function HorariosInput(props: HorariosInputProps) {
    const [horaHover, setHoraHover] = useState<string | null>(null)
    const { horariosOcupados, configuracoes } = useAgendamento()
    // Horários do dia selecionado (cada dia pode ter abertura/fechamento próprios).
    const { manha, tarde, noite } = horariosDoDia(configuracoes, props.data)
    const semHorarios = manha.length === 0 && tarde.length === 0 && noite.length === 0

    const horaSelecionada = props.data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })

    function obterPeriodo(horario: string | null, qtde: number) {
        if (!horario) return []
        const horarios = manha.includes(horario) ? manha : tarde.includes(horario) ? tarde : noite
        const indice = horarios.findIndex((h) => horario == h)
        return horarios.slice(indice, indice + qtde)
    }

    // Um horário "passou" se, para o dia selecionado, o momento já ficou no passado.
    function horarioPassou(horario: string): boolean {
        return aplicarHorario(props.data, horario).getTime() < Date.now()
    }

    function renderizarHorario(horario: string) {
        const periodo = obterPeriodo(horaHover, props.qtdeHorarios)
        const temHorarios = periodo.length === props.qtdeHorarios
        const destacarHora = temHorarios && periodo.includes(horario)
        const periodoSelecionado = obterPeriodo(horaSelecionada, props.qtdeHorarios)
        const selecionado =
            periodoSelecionado.length === props.qtdeHorarios && periodoSelecionado.includes(horario)
        const naoSelecionavel = !temHorarios && periodo.includes(horario)
        const passou = horarioPassou(horario)
        const periodoBloqueado =
            periodo.includes(horario) &&
            periodo.some((h) => horariosOcupados.includes(h) || horarioPassou(h))
        const ocupado = horariosOcupados?.includes(horario)
        const indisponivel = passou || ocupado

        return (
            <div
                key={horario}
                className={cn(
                    'flex justify-center items-center h-8 border rounded select-none transition-colors',
                    indisponivel ? 'cursor-not-allowed' : 'cursor-pointer border-zinc-800 hover:border-zinc-700',
                    {
                        'bg-yellow-400 border-yellow-400': destacarHora && !indisponivel,
                        'bg-red-500/80 border-red-500': (naoSelecionavel || periodoBloqueado) && !passou,
                        'text-white bg-green-500 border-green-500': selecionado,
                        'bg-red-500/10 border-red-500/30': ocupado,
                        'bg-zinc-900 opacity-40 border-zinc-800/50': passou && !selecionado,
                    }
                )}
                onMouseEnter={() => !indisponivel && setHoraHover(horario)}
                onMouseLeave={() => setHoraHover(null)}
                onClick={() => {
                    if (naoSelecionavel || indisponivel || periodoBloqueado) return
                    props.dataMudou(aplicarHorario(props.data, horario))
                }}
                title={passou ? 'Horário já passou' : ocupado ? 'Horário ocupado' : undefined}
            >
                <span
                    className={cn('text-sm text-zinc-400', {
                        'text-black font-semibold': destacarHora && !indisponivel,
                        'text-white font-semibold': selecionado,
                        'text-zinc-500 line-through': passou && !selecionado,
                        'text-red-400/80 font-semibold': ocupado,
                    })}
                >
                    {passou ? (
                        horario
                    ) : naoSelecionavel || periodoBloqueado || ocupado ? (
                        <IconX size={18} className={ocupado ? "text-red-400/80" : "text-white"} />
                    ) : (
                        horario
                    )}
                </span>
            </div>
        )
    }
    if (semHorarios) {
        return (
            <div className="flex flex-col gap-5 w-full">
                <span className="text-sm uppercase text-zinc-400">Horários Disponíveis</span>
                <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-sm text-zinc-400">
                    A barbearia está fechada neste dia. Escolha outra data.
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 w-full">
            <span className="text-sm uppercase text-zinc-400">Horários Disponíveis</span>
            <div className="flex flex-col gap-3 select-none w-full">
                <span className="text-xs uppercase text-zinc-400">Manhã</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">{manha.map(renderizarHorario)}</div>

                <span className="text-xs uppercase text-zinc-400">Tarde</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">{tarde.map(renderizarHorario)}</div>

                <span className="text-xs uppercase text-zinc-400">Noite</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">{noite.map(renderizarHorario)}</div>
            </div>
        </div>
    )
}
