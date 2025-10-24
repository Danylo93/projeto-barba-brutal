'use client'

import Link from 'next/link'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
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
                            <h2>1. Informações que Coletamos</h2>
                            <p>
                                Coletamos informações que você nos fornece diretamente, como:
                            </p>
                            <ul>
                                <li>Informações de conta (nome, email, telefone)</li>
                                <li>Informações da barbearia (endereço, CNPJ)</li>
                                <li>Dados de clientes e agendamentos</li>
                                <li>Informações de pagamento (processadas pelo Stripe)</li>
                            </ul>

                            <h2>2. Como Usamos suas Informações</h2>
                            <p>
                                Usamos suas informações para:
                            </p>
                            <ul>
                                <li>Fornecer e melhorar nosso serviço</li>
                                <li>Processar pagamentos e gerenciar sua conta</li>
                                <li>Enviar notificações importantes sobre o serviço</li>
                                <li>Fornecer suporte ao cliente</li>
                                <li>Cumprir obrigações legais</li>
                            </ul>

                            <h2>3. Compartilhamento de Informações</h2>
                            <p>
                                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
                                exceto nas seguintes circunstâncias:
                            </p>
                            <ul>
                                <li>Com provedores de serviços que nos ajudam a operar nossa plataforma</li>
                                <li>Quando exigido por lei ou para proteger nossos direitos</li>
                                <li>Com seu consentimento explícito</li>
                            </ul>

                            <h2>4. Segurança dos Dados</h2>
                            <p>
                                Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
                            </p>
                            <ul>
                                <li>Criptografia de dados em trânsito e em repouso</li>
                                <li>Controles de acesso rigorosos</li>
                                <li>Monitoramento contínuo de segurança</li>
                                <li>Backups regulares e seguros</li>
                            </ul>

                            <h2>5. Retenção de Dados</h2>
                            <p>
                                Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e 
                                cumprir nossas obrigações legais. Você pode solicitar a exclusão de seus dados 
                                a qualquer momento.
                            </p>

                            <h2>6. Seus Direitos</h2>
                            <p>
                                Você tem o direito de:
                            </p>
                            <ul>
                                <li>Acessar suas informações pessoais</li>
                                <li>Corrigir informações incorretas</li>
                                <li>Solicitar a exclusão de seus dados</li>
                                <li>Restringir o processamento de suas informações</li>
                                <li>Portabilidade dos dados</li>
                            </ul>

                            <h2>7. Cookies e Tecnologias Similares</h2>
                            <p>
                                Usamos cookies e tecnologias similares para melhorar sua experiência em nosso site. 
                                Você pode controlar o uso de cookies através das configurações do seu navegador.
                            </p>

                            <h2>8. Transferência Internacional</h2>
                            <p>
                                Seus dados podem ser transferidos e processados em países diferentes do seu país de residência. 
                                Garantimos que essas transferências sejam feitas com proteções adequadas.
                            </p>

                            <h2>9. Menores de Idade</h2>
                            <p>
                                Nosso serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente 
                                informações pessoais de menores de idade.
                            </p>

                            <h2>10. Alterações nesta Política</h2>
                            <p>
                                Podemos atualizar esta Política de Privacidade periodicamente. 
                                Notificaremos você sobre mudanças significativas através do email ou através de nosso serviço.
                            </p>

                            <h2>11. Contato</h2>
                            <p>
                                Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco:
                            </p>
                            <ul>
                                <li>Email: <a href="mailto:privacy@barbabrutal.com" className="text-green-600 hover:text-green-700">privacy@barbabrutal.com</a></li>
                                <li>Telefone: (11) 99999-9999</li>
                                <li>Endereço: Rua das Barbearias, 123 - São Paulo, SP</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
