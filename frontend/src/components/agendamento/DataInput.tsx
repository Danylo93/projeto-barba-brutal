import DiaInput from './DiaInput'
import HorariosInput from './HorariosInput'
import useAgendamento from '@/data/hooks/useAgendamento'

export interface DataInputProps {
    data: Date
    quantidadeDeSlots: number
    dataMudou: (data: Date) => void
}

export default function DataInput(props: DataInputProps) {
    const { configuracoes } = useAgendamento()
    const { data, quantidadeDeSlots, dataMudou } = props

    return (
        <div className="flex flex-col gap-10">
            <DiaInput data={data} dataMudou={dataMudou} configuracoes={configuracoes} />
            <HorariosInput data={data} qtdeHorarios={quantidadeDeSlots} dataMudou={dataMudou} />
        </div>
    )
}
