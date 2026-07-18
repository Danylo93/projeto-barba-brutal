import { hoje } from '@/lib/agendamento-utils'

export interface DiaInputProps {
    data: Date
    dataMudou(data: Date): void
    configuracoes?: any
}

export default function DiaInput(props: DiaInputProps) {
    const diasAbertos = props.configuracoes?.diasAbertos || [1, 2, 3, 4, 5, 6]

    function renderizarDia(data: Date) {
        const selecionado = data.getDate() === props.data.getDate()
        return (
            <div
                key={data.toISOString()}
                onClick={() => props.dataMudou(data)}
                className={`
                    flex-1 min-w-0 flex flex-col items-center gap-1.5 sm:gap-2 py-3 sm:py-4 cursor-pointer
                    ${selecionado ? 'bg-yellow-400 text-black' : 'text-zinc-400'}
                `}
            >
                <div className="flex items-baseline gap-0.5 sm:gap-1">
                    <span className="text-lg sm:text-2xl font-black">{data.getDate()}</span>
                    <span className="text-[10px] sm:text-xs font-light uppercase">
                        {data.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}
                    </span>
                </div>
                <div
                    className={`
                        text-center text-[10px] sm:text-xs font-light uppercase
                        ${selecionado ? 'bg-black/10' : 'bg-white/10'}
                        py-0.5 px-2 sm:px-3 rounded-full
                    `}
                >
                    {data.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 w-full">
            <span className="text-sm uppercase text-zinc-400">Dias Disponíveis</span>
            <div className="flex gap-0.5 sm:gap-2 bg-zinc-950 rounded-lg overflow-hidden w-full">
                {Array.from({ length: 14 })
                    .map((_, i) => new Date(hoje().getTime() + 86400000 * i))
                    .filter((date) => diasAbertos.includes(date.getDay()))
                    .slice(0, 7)
                    .map((date) => renderizarDia(date))}
            </div>
        </div>
    )
}
