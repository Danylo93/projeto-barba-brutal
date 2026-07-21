import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Botão padrão do sistema (identidade amarela da marca). Variantes e tamanhos
 * consistentes, estado de carregando e foco acessível. Prefira este componente
 * a `<button>` com classes soltas nas telas internas.
 */
const botaoVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap ' +
        'transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 ' +
        'focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    {
        variants: {
            variante: {
                primario:
                    'bg-yellow-400 text-zinc-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/10',
                secundario:
                    'border border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600',
                fantasma: 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
                perigo: 'bg-red-500 text-white hover:bg-red-400',
            },
            tamanho: {
                sm: 'h-9 px-3 text-sm',
                md: 'h-11 px-5 text-sm',
                lg: 'h-12 px-7 text-base',
            },
            cheio: {
                true: 'w-full',
                false: '',
            },
        },
        defaultVariants: { variante: 'primario', tamanho: 'md', cheio: false },
    }
)

export interface BotaoProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof botaoVariants> {
    carregando?: boolean
}

const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
    ({ className, variante, tamanho, cheio, carregando, disabled, children, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(botaoVariants({ variante, tamanho, cheio }), className)}
            disabled={disabled || carregando}
            {...props}
        >
            {carregando && <Loader2 className="animate-spin" size={18} />}
            {children}
        </button>
    )
)
Botao.displayName = 'Botao'

export { Botao, botaoVariants }
