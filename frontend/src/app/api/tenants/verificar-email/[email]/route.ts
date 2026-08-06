import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy para o endpoint de verificação de e-mail do backend.
 * Público — usado pelo formulário de cadastro para checar disponibilidade em tempo real.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ email: string }> }) {
    const params = await props.params;
    const email = params.email

    if (!email) {
        return NextResponse.json(
            { disponivel: false, mensagem: 'E-mail não informado.' },
            { status: 200 },
        )
    }

    const backend =
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_URL_BASE ||
        'https://barba-brutal-api.onrender.com'

    try {
        const res = await fetch(
            `${backend}/tenants/verificar-email/${encodeURIComponent(email)}`,
            { cache: 'no-store' },
        )

        if (!res.ok) {
            return NextResponse.json(
                { disponivel: false, mensagem: 'Erro ao verificar e-mail.' },
                { status: 200 },
            )
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json(
            { disponivel: false, mensagem: 'Erro de conexão. Tente novamente.' },
            { status: 500 },
        )
    }
}
