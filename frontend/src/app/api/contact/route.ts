import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar dados obrigatórios
    if (!body.nome || !body.email || !body.mensagem) {
      return NextResponse.json(
        { message: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Aqui você pode implementar o envio de email
    // Por exemplo, usando Nodemailer, SendGrid, ou outro serviço

    if (process.env.NODE_ENV === 'development') {
      console.log('Mensagem de contato recebida:', body)
    }
    
    // Retornar sucesso
    return NextResponse.json({ message: 'Mensagem enviada com sucesso!' })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') { console.error('Erro ao enviar mensagem de contato:', error) }
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}