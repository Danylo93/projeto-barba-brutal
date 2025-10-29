import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados obrigatórios
    if (!body.email || !body.senha || !body.tenantId) {
      return NextResponse.json(
        { message: 'Email, senha e tenantId são obrigatórios' },
        { status: 400 }
      )
    }

    // Fazer requisição para o backend
    const response = await fetch(`${process.env.BACKEND_URL}/auth/usuario/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') { console.error('Erro ao fazer login de usuário:', error) }
    }
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

