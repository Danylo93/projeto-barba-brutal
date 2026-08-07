'use client'
import { ProvedorAgendamento } from '@/data/contexts/ContextoAgendamento'
import ForcarUsuario from '@/components/shared/ForcarUsuario'
import PainelNav from '@/components/painel/PainelNav'
import TrialBanner from '@/components/shared/TrialBanner'
import Pagina from '@/components/shared/Pagina'
import BloqueioAssinatura from '@/components/shared/BloqueioAssinatura'

// `children` tipado, e não `props: any`: com `any` o codemod do Next 16 leu
// isto como uma prop assíncrona e envolveu tudo num `use()` — que estoura em
// tempo de execução, porque children é elemento, não promessa.
export default function Layout(props: { children: React.ReactNode }) {
    return (
        <ForcarUsuario>
            <ProvedorAgendamento>
                <BloqueioAssinatura>
                    <div className="min-h-screen bg-tenant-primary text-zinc-100">
                        <PainelNav />
                        <TrialBanner />
                        <Pagina>{props.children}</Pagina>
                    </div>
                </BloqueioAssinatura>
            </ProvedorAgendamento>
        </ForcarUsuario>
    )
}
