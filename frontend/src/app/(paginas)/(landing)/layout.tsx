'use client'
import Pagina from '@/components/shared/Pagina'

export default function Layout(props: any) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Pagina>{props.children}</Pagina>
        </div>
    )
}
