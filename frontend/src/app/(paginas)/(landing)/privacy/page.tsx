import Link from 'next/link'
import PaginaLegal, { AvisoPreenchimento, Lista, Secao } from '@/components/legal/PaginaLegal'

export const metadata = {
    title: 'Política de Privacidade | Barbearia Brutal',
    description: 'Como o Barbearia Brutal trata dados pessoais, conforme a LGPD (Lei 13.709/2018).',
}

export default function PoliticaDePrivacidade() {
    return (
        <PaginaLegal
            titulo="Política de Privacidade"
            versao="2026-07-28"
            atualizadoEm="28 de julho de 2026"
            resumo="Esta política segue a Lei Geral de Proteção de Dados (Lei 13.709/2018). O ponto mais importante: quando você é cliente de uma barbearia, quem responde pelos seus dados é a barbearia — o Barbearia Brutal é o sistema que ela usa."
        >
            <AvisoPreenchimento />

            <Secao titulo="1. Quem é quem no tratamento dos seus dados">
                <p>
                    A LGPD separa dois papéis, e a diferença muda a quem você recorre. O{' '}
                    <strong className="text-zinc-200">controlador</strong> decide por que e como os
                    dados são tratados. O <strong className="text-zinc-200">operador</strong> trata
                    os dados em nome do controlador.
                </p>
                <Lista
                    itens={[
                        <>
                            <strong className="text-zinc-200">Dados de cadastro das barbearias</strong>{' '}
                            (nome, e-mail, telefone, CNPJ do assinante): o Barbearia Brutal é o
                            controlador.
                        </>,
                        <>
                            <strong className="text-zinc-200">Dados dos clientes de cada barbearia</strong>{' '}
                            (nome, contato, histórico de agendamento): a{' '}
                            <strong className="text-zinc-200">barbearia é a controladora</strong>. Ela
                            decide o que coletar e por quê; o Barbearia Brutal atua como operador,
                            tratando esses dados por conta e ordem dela e apenas para operar o serviço.
                        </>,
                    ]}
                />
                <p>
                    Na prática: se você é cliente e quer saber por que a barbearia guarda seu
                    telefone, fale com a barbearia. Se a dúvida é sobre a segurança do sistema, fale
                    conosco.
                </p>
            </Secao>

            <Secao titulo="2. Identificação do controlador">
                <Lista
                    itens={[
                        <>Razão social: <strong className="text-zinc-200">Danylo Alves de Oliveira (Agência FW Digital)</strong></>,
                        <>CNPJ: <strong className="text-zinc-200">46.595.026/0001-20</strong></>,
                        <>Endereço: <strong className="text-zinc-200">Rua principal (Endereço mantido em cadastro confidencial)</strong></>,
                        <>
                            Encarregado pelo tratamento de dados (DPO, art. 41):{' '}
                            <strong className="text-zinc-200">Agência FW Digital (agenciafwdigital@gmail.com)</strong>
                        </>,
                    ]}
                />
            </Secao>

            <Secao titulo="3. Que dados tratamos, e com que base legal">
                <p>
                    A LGPD exige uma base legal para cada tratamento (art. 7º). Não usamos
                    consentimento para tudo — usar consentimento onde a lei já autoriza dá a falsa
                    impressão de que você pode revogar e o serviço continuar funcionando.
                </p>
                <Lista
                    itens={[
                        <>
                            <strong className="text-zinc-200">Cadastro e login</strong> (nome, e-mail,
                            telefone, senha cifrada) — base: execução de contrato (art. 7º, V). Sem
                            isso não há conta.
                        </>,
                        <>
                            <strong className="text-zinc-200">Agendamentos</strong> (data, serviço,
                            profissional, observações) — base: execução de contrato. É o próprio
                            serviço contratado.
                        </>,
                        <>
                            <strong className="text-zinc-200">Mensagens de confirmação e lembrete</strong>{' '}
                            no WhatsApp e e-mail — base: execução de contrato, por serem sobre o
                            agendamento que você mesmo fez. Comunicação promocional é coisa
                            diferente e depende de consentimento.
                        </>,
                        <>
                            <strong className="text-zinc-200">Lembrete para refazer um serviço</strong>{' '}
                            no WhatsApp — base: consentimento (art. 7º, I). Essa mensagem só pode
                            sair depois de um atendimento concluído e pode ser autorizada ou
                            desativada a qualquer momento em Meus dados, sem impedir o uso da agenda.
                        </>,
                        <>
                            <strong className="text-zinc-200">Pagamentos</strong> (valor, status,
                            código Pix) — base: execução de contrato e obrigação legal fiscal. Não
                            recebemos nem guardamos dados de cartão.
                        </>,
                        <>
                            <strong className="text-zinc-200">Registros de acesso</strong> (IP, data,
                            navegador) — base: cumprimento de obrigação legal (Marco Civil da
                            Internet, art. 15) e segurança.
                        </>,
                        <>
                            <strong className="text-zinc-200">Cookies de análise e marketing</strong> —
                            base: consentimento (art. 7º, I), que você dá ou recusa no aviso da
                            primeira visita e pode mudar quando quiser.
                        </>,
                    ]}
                />
            </Secao>

            <Secao titulo="4. Com quem compartilhamos">
                <p>
                    Não vendemos dados pessoais. O compartilhamento acontece só com quem é
                    necessário para o sistema funcionar:
                </p>
                <Lista
                    itens={[
                        'Provedor de hospedagem e banco de dados, para armazenar as informações.',
                        'Provedor de envio de mensagens (WhatsApp e e-mail), para as notificações de agendamento.',
                        'Autoridades públicas, quando houver ordem legal ou judicial.',
                    ]}
                />
            </Secao>

            <Secao titulo="5. Transferência internacional">
                <p>
                    Nossa infraestrutura usa provedores com servidores fora do Brasil. A
                    transferência é feita com base no art. 33 da LGPD e nas cláusulas contratuais
                    firmadas com esses fornecedores, que exigem grau de proteção compatível com a
                    lei brasileira.
                </p>
            </Secao>

            <Secao titulo="6. Por quanto tempo guardamos">
                <Lista
                    itens={[
                        'Dados de conta: enquanto a conta existir.',
                        'Histórico de agendamento e pagamento: 5 anos após o atendimento, prazo em que a barbearia pode precisar deles para defesa em processo ou obrigação fiscal.',
                        'Registros de acesso: 6 meses, conforme o Marco Civil da Internet.',
                        'Prova de consentimento: enquanto o tratamento durar e pelo prazo em que puder ser questionado.',
                    ]}
                />
                <p>
                    Passado o prazo, os dados são apagados ou anonimizados de forma que não seja
                    mais possível ligá-los a você.
                </p>
            </Secao>

            <Secao titulo="7. Seus direitos, e como exercer">
                <p>
                    O art. 18 garante a você confirmar a existência de tratamento, acessar os dados,
                    corrigir dados incompletos ou desatualizados, pedir anonimização ou eliminação,
                    solicitar portabilidade, saber com quem compartilhamos, revogar consentimento e
                    se opor a um tratamento.
                </p>
                <p>
                    Você não precisa pedir por e-mail e esperar: entre na sua conta e vá em{' '}
                    <Link href="/meus-dados" className="text-yellow-400 underline underline-offset-2">
                        Meus dados
                    </Link>
                    . Lá dá para baixar tudo que guardamos sobre você em um arquivo, rever cada
                    consentimento e pedir a exclusão da conta.
                </p>
                <p>
                    O prazo de resposta é de até 15 dias (art. 19, II). Se preferir o canal escrito,
                    fale com o encarregado indicado no item 2.
                </p>
            </Secao>

            <Secao titulo="8. Segurança">
                <Lista
                    itens={[
                        'Senha guardada com hash — nem nós conseguimos lê-la.',
                        'Tráfego cifrado em HTTPS.',
                        'Acesso separado por barbearia: um estabelecimento não enxerga dado de outro.',
                        'Controle de acesso por papel (dono, profissional, cliente).',
                    ]}
                />
                <p>
                    Se ocorrer incidente de segurança com risco relevante, comunicaremos você e a
                    ANPD, conforme o art. 48.
                </p>
            </Secao>

            <Secao titulo="9. Crianças e adolescentes">
                <p>
                    O sistema é destinado a maiores de 18 anos. O agendamento de menor deve ser
                    feito por quem detém a guarda, que responde pelo consentimento nos termos do
                    art. 14.
                </p>
            </Secao>

            <Secao titulo="10. Mudanças nesta política">
                <p>
                    Ao alterarmos o texto, a versão indicada no topo muda e você é avisado no
                    sistema. Alteração que dependa de novo consentimento não vale retroativamente:
                    pediremos seu aceite de novo.
                </p>
            </Secao>

            <Secao titulo="11. Reclamação à ANPD">
                <p>
                    Se entender que seus direitos não foram atendidos, você pode reclamar à
                    Autoridade Nacional de Proteção de Dados pelo site{' '}
                    <a
                        href="https://www.gov.br/anpd"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 underline underline-offset-2"
                    >
                        gov.br/anpd
                    </a>
                    .
                </p>
            </Secao>
        </PaginaLegal>
    )
}
