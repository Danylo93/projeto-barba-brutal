import { useServicos } from '@/hooks/use-servicos'
import useAgendamento from '@/data/hooks/useAgendamento'
import { Servico } from '@/lib/agendamento-utils'
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
        <div
            className={`relative flex flex-col items-center cursor-pointer select-none border rounded-lg overflow-hidden transition-colors
            ${props.selecionado ? 'border-green-400' : 'border-zinc-700 hover:border-zinc-600'}`}
            onClick={() => props.onClick(props.servico)}
        >
            {props.servico.ehCombo && (
                <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-yellow-400 text-black text-[10px] font-bold uppercase px-2 py-0.5">
                    Combo
                </span>
            )}
            <Image
                src={props.servico.imagemURL}
                alt={props.servico.nome}
                width={150}
                height={120}
                className="w-full h-auto object-cover"
            />
            <div
                className={`
                    py-2 w-full h-full text-center text-xs
                    ${props.selecionado ? 'text-black bg-green-400 font-semibold' : 'text-zinc-400 font-light bg-zinc-900 '}
                `}
            >
                {props.servico.nome}
            </div>
        </div>
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
