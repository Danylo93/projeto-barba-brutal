'use client'

import Link from 'next/link'

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Política de Cookies</h1>
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
                            <h2>1. O que são Cookies</h2>
                            <p>
                                Cookies são pequenos arquivos de texto que são armazenados no seu dispositivo quando você visita nosso site. 
                                Eles nos ajudam a fornecer uma experiência melhor e mais personalizada.
                            </p>

                            <h2>2. Tipos de Cookies que Usamos</h2>
                            
                            <h3>Cookies Essenciais</h3>
                            <p>
                                Estes cookies são necessários para o funcionamento básico do site e não podem ser desativados:
                            </p>
                            <ul>
                                <li>Cookies de autenticação</li>
                                <li>Cookies de sessão</li>
                                <li>Cookies de segurança</li>
                            </ul>

                            <h3>Cookies de Funcionalidade</h3>
                            <p>
                                Estes cookies melhoram a funcionalidade do site:
                            </p>
                            <ul>
                                <li>Preferências do usuário</li>
                                <li>Configurações de idioma</li>
                                <li>Lembrar informações de login</li>
                            </ul>

                            <h3>Cookies de Analytics</h3>
                            <p>
                                Estes cookies nos ajudam a entender como você usa nosso site:
                            </p>
                            <ul>
                                <li>Páginas visitadas</li>
                                <li>Tempo gasto no site</li>
                                <li>Links clicados</li>
                            </ul>

                            <h3>Cookies de Marketing</h3>
                            <p>
                                Estes cookies são usados para mostrar anúncios relevantes:
                            </p>
                            <ul>
                                <li>Anúncios personalizados</li>
                                <li>Medição de campanhas</li>
                                <li>Remarketing</li>
                            </ul>

                            <h2>3. Como Gerenciar Cookies</h2>
                            <p>
                                Você pode controlar e gerenciar cookies de várias maneiras:
                            </p>
                            
                            <h3>Configurações do Navegador</h3>
                            <p>
                                A maioria dos navegadores permite que você:
                            </p>
                            <ul>
                                <li>Veja quais cookies estão armazenados</li>
                                <li>Exclua cookies individuais ou todos os cookies</li>
                                <li>Bloqueie cookies de sites específicos</li>
                                <li>Bloqueie cookies de terceiros</li>
                                <li>Receba notificações antes que novos cookies sejam armazenados</li>
                            </ul>

                            <h3>Links para Configurações de Navegadores Populares</h3>
                            <ul>
                                <li><a href="https://support.google.com/chrome/answer/95647" className="text-green-600 hover:text-green-700" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                                <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-green-600 hover:text-green-700" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-green-600 hover:text-green-700" target="_blank" rel="noopener noreferrer">Safari</a></li>
                                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-green-600 hover:text-green-700" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
                            </ul>

                            <h2>4. Cookies de Terceiros</h2>
                            <p>
                                Nosso site pode conter cookies de terceiros, incluindo:
                            </p>
                            <ul>
                                <li>Google Analytics</li>
                                <li>Stripe (para processamento de pagamentos)</li>
                                <li>Redes sociais (Facebook, Instagram, etc.)</li>
                            </ul>

                            <h2>5. Impacto de Desabilitar Cookies</h2>
                            <p>
                                Se você desabilitar cookies, algumas funcionalidades do nosso site podem não funcionar corretamente:
                            </p>
                            <ul>
                                <li>Você pode não conseguir fazer login</li>
                                <li>Suas preferências podem não ser salvas</li>
                                <li>Algumas páginas podem não carregar corretamente</li>
                            </ul>

                            <h2>6. Atualizações desta Política</h2>
                            <p>
                                Podemos atualizar esta Política de Cookies periodicamente. 
                                Recomendamos que você revise esta página regularmente para se manter informado sobre como usamos cookies.
                            </p>

                            <h2>7. Contato</h2>
                            <p>
                                Se você tiver dúvidas sobre nossa Política de Cookies, entre em contato conosco:
                            </p>
                            <ul>
                                <li>Email: <a href="mailto:cookies@barbabrutal.com" className="text-green-600 hover:text-green-700">cookies@barbabrutal.com</a></li>
                                <li>Telefone: (11) 99999-9999</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
