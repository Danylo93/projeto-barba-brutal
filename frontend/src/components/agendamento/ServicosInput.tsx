import { useServicos } from '@/hooks/use-servicos'
import useAgendamento from '@/data/hooks/useAgendamento'
import { Servico } from '@/lib/agendamento-utils'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import Image from 'next/image'

export interface ServicosInputProps {
    servicos: Servico[]
    servicosMudou: (servicos: Servico[]) => void
}

function Opcao(props: {
    servico: Servico
    onClick: (s: Servico) => void
    selecionado?: boolean
}) {
    return (
        <button
            type="button"
            onClick={() => props.onClick(props.servico)}
            className={cn(
                'group relative flex w-full select-none flex-col items-center overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5',
                props.selecionado
                    ? 'border-green-400 shadow-lg shadow-green-500/10 ring-2 ring-green-400/50'
                    : 'border-zinc-700 hover:border-zinc-600'
            )}
        >
            {props.servico.ehCombo && (
                <span className="absolute left-2 top-2 z-10 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-900">
                    Combo
                </span>
            )}
            {props.selecionado && (
                <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-400 text-zinc-900 shadow">
                    <Check size={15} strokeWidth={3} />
                </span>
            )}
            <div className="w-full overflow-hidden">
                <Image
                    src={props.servico.imagemURL}
                    alt={props.servico.nome}
                    width={150}
                    height={120}
                    className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                {props.servico.nome}
            </div>
        </button>
    )
}

export default function ServicosInput(props: ServicosInputProps) {
    const { servicosMudou } = props
    const { servicos: todosServicos } = useServicos()
    const { profissional } = useAgendamento()

    // Mostra apenas os serviços que o profissional selecionado realiza.
    // Se o profissional ainda não tem serviços vinculados, mantém a lista completa
    // (compatibilidade com dados antigos, antes do vínculo existir).
    const idsPermitidos = profissional?.servicos?.map((s) => s.id) ?? []
    const servicosDisponiveis = idsPermitidos.length
        ? todosServicos.filter((s) => idsPermitidos.includes(s.id))
        : todosServicos

    function alternarMarcacaoServico(servico: Servico) {
        const jaSelecionado = props.servicos.some((s) => s.id === servico.id)

        // Combo é exclusivo: ao escolher um combo, ele substitui toda a seleção;
        // clicar novamente no combo o desmarca.
        if (servico.ehCombo) {
            servicosMudou(jaSelecionado ? [] : [servico])
            return
        }

        // Serviço comum: se havia um combo selecionado, ele é removido.
        const semCombo = props.servicos.filter((s) => !s.ehCombo)
        servicosMudou(
            jaSelecionado
                ? semCombo.filter((s) => s.id !== servico.id)
                : [...semCombo, servico]
        )
    }

    if (!profissional) {
        return (
            <div className="flex flex-col gap-5 w-full">
                <span className="text-sm uppercase text-zinc-400">Serviços Disponíveis</span>
                <p className="text-sm text-zinc-500">
                    Selecione um profissional para ver os serviços disponíveis.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 w-full">
            <span className="text-sm uppercase text-zinc-400">Serviços Disponíveis</span>
            {servicosDisponiveis.length === 0 ? (
                <p className="text-sm text-zinc-500">
                    Este profissional ainda não tem serviços cadastrados.
                </p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
                    {servicosDisponiveis.map((servico) => (
                        <Opcao
                            key={servico.id}
                            servico={servico}
                            onClick={alternarMarcacaoServico}
                            selecionado={props.servicos.some((serv) => serv.id === servico.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
