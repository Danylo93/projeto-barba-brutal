import Image from 'next/image'
import Link from 'next/link'

export interface LogoProps {
    href?: string
    /** Nome da barbearia (tenant). Sem isso, usa a marca padrão do sistema. */
    nome?: string | null
    /** Esconde o nome abaixo de 1280px, deixando só o brasão (usado na barra do painel). */
    compacto?: boolean
}

export default function Logo({ href = '/', nome, compacto = false }: LogoProps) {
    let linha1 = 'Barbearia'
    let linha2 = 'Brutal'
    const limpo = (nome ?? '').trim()
    if (limpo) {
        const partes = limpo.split(/\s+/)
        if (partes.length === 1) {
            linha1 = ''
            linha2 = partes[0]
        } else {
            linha1 = partes[0]
            linha2 = partes.slice(1).join(' ')
        }
    }

    return (
        <Link href={href} className="flex shrink-0 items-center h-14">
            <Image src="/logo.png" alt="Logo" width={65} height={65} className="hidden shrink-0 sm:block" />
            <Image src="/logo.png" alt="Logo" width={50} height={50} className="block shrink-0 sm:hidden" />
            <div
                className={`${compacto ? 'hidden xl:flex' : 'flex'} flex-col justify-center h-full`}
            >
                {linha1 && (
                    <span className="whitespace-nowrap text-xl sm:text-2xl font-extralight leading-6 tracking-widest text-gradient">
                        {linha1}
                    </span>
                )}
                <span className="whitespace-nowrap text-[20px] sm:text-[24px] font-bold leading-6 pl-px text-gradient">
                    {linha2}
                </span>
            </div>
        </Link>
    )
}
