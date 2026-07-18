'use client'

import Link from 'next/link'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
                            <p className="text-gray-600">Última atualização: 20 de janeiro de 2024</p>
                        </div>
                        <Link
                            href="/"
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white shadow rounded-lg p-8">
                        <div className="prose max-w-none">
                            <h2>1. Aceitação dos Termos</h2>
                            <p>
                                Ao utilizar o sistema Barbearia Brutal SaaS, você concorda em cumprir e estar sujeito a estes Termos de Uso. 
                                Se você não concordar com qualquer parte destes termos, não deve usar nosso serviço.
                            </p>

                            <h2>2. Descrição do Serviço</h2>
                            <p>
                                O Barbearia Brutal SaaS é uma plataforma de gestão para barbearias que oferece:
                            </p>
                            <ul>
                                <li>Sistema de agendamentos online</li>
                                <li>Gestão de clientes e profissionais</li>
                                <li>Relatórios e analytics</li>
                                <li>Integração com WhatsApp</li>
                                <li>Aplicativo mobile para clientes</li>
                            </ul>

                            <h2>3. Conta e Registro</h2>
                            <p>
                                Para usar nosso serviço, você deve:
                            </p>
                            <ul>
                                <li>Fornecer informações verdadeiras e precisas</li>
                                <li>Manter suas credenciais de login seguras</li>
                                <li>Ser responsável por todas as atividades em sua conta</li>
                                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
                            </ul>

                            <h2>4. Planos e Pagamentos</h2>
                            <p>
                                Oferecemos diferentes planos de assinatura com recursos e limites específicos. 
                                Os pagamentos são processados através do Stripe e são cobrados mensalmente ou anualmente, 
                                conforme o plano escolhido.
                            </p>

                            <h2>5. Período de Teste</h2>
                            <p>
                                Oferecemos um período de teste gratuito de 14 dias. Durante este período, 
                                você pode usar todos os recursos do plano escolhido sem compromisso.
                            </p>

                            <h2>6. Cancelamento</h2>
                            <p>
                                Você pode cancelar sua assinatura a qualquer momento através do seu painel de controle. 
                                O cancelamento entrará em vigor no final do período de cobrança atual.
                            </p>

                            <h2>7. Uso Aceitável</h2>
                            <p>
                                Você concorda em usar nosso serviço apenas para fins legais e de acordo com estes termos. 
                                É proibido:
                            </p>
                            <ul>
                                <li>Usar o serviço para atividades ilegais</li>
                                <li>Tentar acessar contas de outros usuários</li>
                                <li>Interferir no funcionamento do serviço</li>
                                <li>Fazer engenharia reversa do software</li>
                            </ul>

                            <h2>8. Propriedade Intelectual</h2>
                            <p>
                                Todo o conteúdo e software do Barbearia Brutal SaaS são propriedade nossa ou de nossos licenciadores. 
                                Você não tem direito de usar, copiar ou distribuir nosso conteúdo sem autorização.
                            </p>

                            <h2>9. Privacidade</h2>
                            <p>
                                Sua privacidade é importante para nós. Consulte nossa Política de Privacidade para entender 
                                como coletamos, usamos e protegemos suas informações.
                            </p>

                            <h2>10. Limitação de Responsabilidade</h2>
                            <p>
                                Nosso serviço é fornecido &ldquo;como está&rdquo; sem garantias de qualquer tipo. Não seremos responsáveis
                                por danos diretos, indiretos, incidentais ou consequenciais resultantes do uso de nosso serviço.
                            </p>

                            <h2>11. Modificações</h2>
                            <p>
                                Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                                As modificações entrarão em vigor imediatamente após a publicação.
                            </p>

                            <h2>12. Contato</h2>
                            <p>
                                Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco através do email: 
                                <a href="mailto:suporte@barbabrutal.com" className="text-green-600 hover:text-green-700">
                                    suporte@barbabrutal.com
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
