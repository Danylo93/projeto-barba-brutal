import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy para o endpoint de verificação de slug do backend.
 * Público — usado pelo formulário de cadastro para checar disponibilidade
 * de subdomínio em tempo real.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } },
) {
    const slug = params.slug

    if (!slug || slug.length < 2) {
        return NextResponse.json(
            { disponivel: false, slug: '', mensagem: 'Digite pelo menos 2 caracteres.' },
            { status: 200 },
        )
    }

    const backend =
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_URL_BASE ||
        'https://barba-brutal-api.onrender.com'

    try {
        const res = await fetch(
            `${backend}/tenants/verificar-slug/${encodeURIComponent(slug)}`,
            { cache: 'no-store' },
        )

        if (!res.ok) {
            return NextResponse.json(
                { disponivel: false, slug, mensagem: 'Erro ao verificar disponibilidade.' },
                { status: 200 },
            )
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json(
            { disponivel: false, slug, mensagem: 'Erro de conexão. Tente novamente.' },
            { status: 500 },
        )
    }
}
