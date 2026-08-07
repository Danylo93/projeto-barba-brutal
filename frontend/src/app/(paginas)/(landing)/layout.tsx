'use client'
import Pagina from '@/components/shared/Pagina'

export default function Layout(props: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Pagina>{props.children}</Pagina>
        </div>
    )
}
