import Rodape from './Rodape'

export interface PaginaProps {
    children: React.ReactNode
}
export default function Pagina(props: PaginaProps) {
    return (
        <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
            <main className="flex-1">{props.children}</main>
            <Rodape />
        </div>
    )
}
