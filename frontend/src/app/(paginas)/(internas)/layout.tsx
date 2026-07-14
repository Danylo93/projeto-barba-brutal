'use client'
import { ProvedorAgendamento } from '@/data/contexts/ContextoAgendamento'
import ForcarUsuario from '@/components/shared/ForcarUsuario'
import PainelNav from '@/components/painel/PainelNav'
import Pagina from '@/components/shared/Pagina'

export default function Layout(props: any) {
    return (
        <ForcarUsuario>
            <ProvedorAgendamento>
                <div className="bg-zinc-950">
                    <PainelNav />
                    <Pagina>{props.children}</Pagina>
                </div>
            </ProvedorAgendamento>
        </ForcarUsuario>
    )
}
