import { useProfissionais } from '@/hooks/use-profissionais'
import { Profissional } from '@/lib/agendamento-utils'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import Image from 'next/image'

export interface ProfissionalInputProps {
    profissional: Profissional | null
    profissionalMudou: (profissional: Profissional) => void
}

function Opcao(props: {
    profissional: Profissional
    onClick: (p: Profissional) => void
    selecionado?: boolean
}) {
    return (
        <button
            type="button"
            onClick={() => props.onClick(props.profissional)}
            className={cn(
                'group relative flex w-full select-none flex-col items-center overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5',
                props.selecionado
                    ? 'border-green-400 shadow-lg shadow-green-500/10 ring-2 ring-green-400/50'
                    : 'border-zinc-700 hover:border-zinc-600'
            )}
        >
            {props.selecionado && (
                <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-400 text-zinc-900 shadow">
                    <Check size={15} strokeWidth={3} />
                </span>
            )}
            <div className="w-full overflow-hidden">
                <Image
                    src={props.profissional.imagemUrl}
                    alt={props.profissional.nome}
                    width={150}
                    height={150}
                    className="aspect-square h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>
            <div
                className={cn(
                    'w-full py-2 text-center text-xs',
                    props.selecionado
                        ? 'bg-green-400 font-semibold text-zinc-900'
                        : 'bg-zinc-900 font-light text-zinc-300'
                )}
            >
                {props.profissional.nome.split(' ')[0]}
            </div>
        </button>
    )
}

export default function ProfissionalInput(props: ProfissionalInputProps) {
    const { profissionais } = useProfissionais()

    return (
        <div className="flex flex-col gap-5 w-full">
            <span className="text-sm uppercase text-zinc-400">Profissionais Disponíveis</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
                {profissionais.map((profissional) => (
                    <Opcao
                        key={profissional.id}
                        profissional={profissional}
                        onClick={props.profissionalMudou}
                        selecionado={profissional.id === props.profissional?.id}
                    />
                ))}
            </div>
        </div>
    )
}
