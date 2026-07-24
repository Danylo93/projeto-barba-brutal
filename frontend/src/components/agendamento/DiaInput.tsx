import { hoje, diasAbertosDaConfig } from '@/lib/agendamento-utils'

export interface DiaInputProps {
    data: Date
    dataMudou(data: Date): void
    configuracoes?: any
}

export default function DiaInput(props: DiaInputProps) {
    const diasAbertos = diasAbertosDaConfig(props.configuracoes)

    function mesmoDia(a: Date, b: Date) {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        )
    }

    function renderizarDia(data: Date) {
        const selecionado = mesmoDia(data, props.data)
        const ehHoje = mesmoDia(data, hoje())
        return (
            <button
                type="button"
                key={data.toISOString()}
                onClick={() => props.dataMudou(data)}
                className={`
                    snap-start shrink-0 w-[3.75rem] sm:w-16
                    flex flex-col items-center gap-1.5 py-3 rounded-xl border
                    transition-all duration-200 active:scale-95
                    ${
                        selecionado
                            ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/70'
                    }
                `}
            >
                <div className="flex flex-col items-center leading-none">
                    <span className="text-xl sm:text-2xl font-black tabular-nums">
                        {data.getDate()}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide mt-0.5">
                        {data.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}
                    </span>
                </div>
                <span
                    className={`
                        text-[10px] font-semibold uppercase tracking-wide
                        ${selecionado ? 'text-black/60' : ehHoje ? 'text-yellow-400' : 'text-zinc-500'}
                    `}
                >
                    {ehHoje ? 'Hoje' : data.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                </span>
            </button>
        )
    }

    return (
        <div className="flex flex-col gap-5 w-full">
            <span className="text-sm uppercase text-zinc-400">Dias Disponíveis</span>
            <div
                className="
                    flex gap-2 w-full overflow-x-auto pb-1 snap-x snap-mandatory
                    [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                "
            >
                {Array.from({ length: 21 })
                    .map((_, i) => new Date(hoje().getTime() + 86400000 * i))
                    .filter((date) => diasAbertos.includes(date.getDay()))
                    .slice(0, 10)
                    .map((date) => renderizarDia(date))}
            </div>
        </div>
    )
}
