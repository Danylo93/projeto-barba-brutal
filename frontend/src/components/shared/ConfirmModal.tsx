import Modal from '../painel/Modal'

export interface ConfirmModalProps {
    aberto: boolean
    titulo: string
    mensagem: string
    textoConfirmar?: string
    textoCancelar?: string
    onConfirmar: () => void
    onCancelar: () => void
    variante?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
    aberto,
    titulo,
    mensagem,
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onCancelar,
    variante = 'danger',
}: ConfirmModalProps) {
    const botaoCores = {
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        info: 'bg-blue-500 hover:bg-blue-600 text-white',
    }

    return (
        <Modal aberto={aberto} titulo={titulo} onFechar={onCancelar}>
            <div className="flex flex-col gap-6">
                <p className="text-zinc-300 text-sm leading-relaxed">{mensagem}</p>
                <div className="flex justify-end gap-3 mt-2">
                    <button
                        onClick={onCancelar}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        {textoCancelar}
                    </button>
                    <button
                        onClick={onConfirmar}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${botaoCores[variante]}`}
                    >
                        {textoConfirmar}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
