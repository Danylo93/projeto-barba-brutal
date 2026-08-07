import Link from 'next/link'
import PaginaLegal, { AvisoPreenchimento, Lista, Secao } from '@/components/legal/PaginaLegal'

export const metadata = {
    title: 'Termos de Uso | Barbearia Brutal',
    description: 'Condições de uso do sistema Barbearia Brutal.',
}

export default function TermosDeUso() {
    return (
        <PaginaLegal
            titulo="Termos de Uso"
            versao="2026-07-28"
            atualizadoEm="28 de julho de 2026"
            resumo="Contrato entre você e o Barbearia Brutal. Se você é dono de barbearia, atenção especial ao item 6: os dados dos seus clientes são de sua responsabilidade, e a lei põe deveres no seu nome."
        >
            <AvisoPreenchimento />

            <Secao titulo="1. O que você está contratando">
                <p>
                    O Barbearia Brutal é um sistema de agendamento e gestão para barbearias, oferecido
                    como serviço pela internet. Ao criar conta, você aceita estes termos. Se não
                    concordar, não use o sistema.
                </p>
                <p>
                    Estes termos valem para dois perfis: a <strong className="text-zinc-200">barbearia</strong>{' '}
                    que assina o serviço e o <strong className="text-zinc-200">cliente</strong> que usa a
                    página dela para agendar.
                </p>
            </Secao>

            <Secao titulo="2. O que o sistema faz">
                <Lista
                    itens={[
                        'Agendamento online, com controle de horários, profissionais e serviços.',
                        'Cadastro de clientes e histórico de atendimento.',
                        'Relatórios de faturamento e comissão por profissional.',
                        'Confirmação e lembrete de agendamento por WhatsApp e e-mail.',
                    ]}
                />
            </Secao>

            <Secao titulo="3. Conta e responsabilidade">
                <Lista
                    itens={[
                        'Os dados informados no cadastro devem ser verdadeiros.',
                        'A senha é pessoal: o que acontece na conta é responsabilidade de quem a detém.',
                        'Uso não autorizado deve ser comunicado assim que percebido.',
                        'É preciso ter 18 anos ou mais para manter conta própria.',
                    ]}
                />
            </Secao>

            <Secao titulo="4. Período de teste, planos e pagamento">
                <p>
                    Novas barbearias entram em período de teste gratuito. Terminado o teste, o acesso
                    depende de plano ativo. O valor e o que cada plano inclui ficam na página de
                    planos, e mudança de preço é avisada com antecedência mínima de 30 dias.
                </p>
                <p>
                    A assinatura pode ser cancelada a qualquer momento e vale até o fim do período já
                    pago. Não há multa por cancelamento.
                </p>
            </Secao>

            <Secao titulo="5. Uso aceitável">
                <p>Não é permitido usar o sistema para:</p>
                <Lista
                    itens={[
                        'Enviar mensagem não solicitada a quem não é cliente da barbearia.',
                        'Cadastrar dado de terceiro sem que essa pessoa saiba e autorize.',
                        'Tentar acessar dados de outra barbearia ou burlar os controles de acesso.',
                        'Sobrecarregar a infraestrutura de forma automatizada.',
                    ]}
                />
                <p>
                    O descumprimento pode levar à suspensão da conta, com aviso prévio sempre que
                    houver como dá-lo.
                </p>
            </Secao>

            <Secao titulo="6. Proteção de dados — o que cabe a cada um">
                <p>
                    A LGPD trata este ponto com nomes próprios, e vale entender:
                </p>
                <Lista
                    itens={[
                        <>
                            A <strong className="text-zinc-200">barbearia é controladora</strong> dos
                            dados dos clientes dela. É ela quem decide o que coletar, informa a
                            finalidade e responde aos pedidos dos titulares.
                        </>,
                        <>
                            O <strong className="text-zinc-200">Barbearia Brutal é operador</strong>:
                            trata esses dados por conta e ordem da barbearia, apenas para prestar o
                            serviço, e adota as medidas de segurança descritas na{' '}
                            <Link href="/privacy" className="text-yellow-400 underline underline-offset-2">
                                Política de Privacidade
                            </Link>
                            .
                        </>,
                    ]}
                />
                <p>
                    Na prática, dono de barbearia: cadastrar cliente sem que ele saiba, ou mandar
                    promoção para quem não autorizou, é responsabilidade sua — não do sistema. O
                    Barbearia Brutal oferece as ferramentas de consentimento e de atendimento aos
                    direitos do titular; usá-las é com você.
                </p>
            </Secao>

            <Secao titulo="7. Disponibilidade">
                <p>
                    Trabalhamos para manter o sistema no ar, mas não há garantia de funcionamento
                    ininterrupto: pode haver manutenção programada, falha de fornecedor ou evento
                    fora do nosso controle. Manutenção planejada é avisada com antecedência sempre
                    que possível.
                </p>
            </Secao>

            <Secao titulo="8. Limitação de responsabilidade">
                <p>
                    O Barbearia Brutal não responde por lucro cessante decorrente de indisponibilidade,
                    nem por decisão comercial tomada com base nos relatórios. Nossa responsabilidade
                    fica limitada ao valor pago pela barbearia nos 12 meses anteriores ao fato.
                </p>
                <p>
                    Esta limitação não afasta os direitos do consumidor previstos no Código de Defesa
                    do Consumidor nem responsabilidade por dolo.
                </p>
            </Secao>

            <Secao titulo="9. Encerramento e seus dados">
                <p>
                    Você pode encerrar a conta quando quiser. Ao encerrar, os dados ficam disponíveis
                    para exportação por 30 dias; depois são apagados ou anonimizados, respeitados os
                    prazos legais de guarda. A exportação pode ser feita a qualquer momento em{' '}
                    <Link href="/meus-dados" className="text-yellow-400 underline underline-offset-2">
                        Meus dados
                    </Link>
                    .
                </p>
            </Secao>

            <Secao titulo="10. Mudanças nestes termos">
                <p>
                    Podemos alterar estes termos. Mudança relevante é comunicada com 30 dias de
                    antecedência, e continuar usando o sistema depois disso significa aceitar a nova
                    versão. Se não concordar, você pode encerrar a conta sem custo.
                </p>
            </Secao>

            <Secao titulo="11. Lei aplicável e foro">
                <p>
                    Aplica-se a lei brasileira. Fica eleito o foro da{' '}
                    <strong className="text-zinc-200">Comarca de São Paulo/SP</strong> para as questões
                    que não puderem ser resolvidas de outro modo, ressalvado o direito do consumidor
                    de acionar o foro do seu domicílio.
                </p>
            </Secao>
        </PaginaLegal>
    )
}
