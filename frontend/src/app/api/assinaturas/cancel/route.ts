import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Token de autorização não fornecido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Fazer requisição para o backend (o tenant autenticado cancela a própria assinatura)
    const response = await fetch(`${process.env.BACKEND_URL}/assinaturas/me/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') { console.error('Erro ao cancelar assinatura:', error) }
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
