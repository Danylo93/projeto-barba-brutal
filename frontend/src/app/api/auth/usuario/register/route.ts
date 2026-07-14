import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.email || !body.senha || !body.nome || !body.tenantId) {
      return NextResponse.json(
        { message: 'Nome, email, senha e tenantId são obrigatórios' },
        { status: 400 }
      )
    }

    const response = await fetch(`${process.env.BACKEND_URL}/auth/usuario/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao registrar usuário:', error)
    }
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
