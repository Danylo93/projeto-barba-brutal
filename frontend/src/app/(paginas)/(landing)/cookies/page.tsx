import Link from 'next/link'
import PaginaLegal, { Lista, Secao } from '@/components/legal/PaginaLegal'

export const metadata = {
    title: 'Política de Cookies | Barbearia Brutal',
    description: 'Que cookies o Barbearia Brutal usa, para quê, e como mudar sua escolha.',
}

export default function PoliticaDeCookies() {
    return (
        <PaginaLegal
            titulo="Política de Cookies"
            versao="2026-07-28"
            atualizadoEm="28 de julho de 2026"
            resumo="Só os cookies essenciais funcionam antes de você decidir. Análise e marketing dependem do seu 'sim' e podem ser desligados a qualquer momento, com a mesma facilidade com que foram ligados."
        >
            <Secao titulo="1. O que são">
                <p>
                    Cookies são arquivos pequenos que o site guarda no seu navegador. Alguns fazem o
                    sistema funcionar; outros só ajudam a entender o uso ou a medir anúncios.
                </p>
            </Secao>

            <Secao titulo="2. Essenciais — sempre ativos">
                <p>
                    Sem eles não há login nem agendamento, então não dependem de consentimento: a
                    LGPD dispensa quando o tratamento é necessário para executar o contrato. Você
                    ainda pode bloqueá-los no navegador, mas o sistema deixa de funcionar.
                </p>
                <Lista
                    itens={[
                        'Sessão: mantém você logado enquanto navega.',
                        'Segurança: protege contra requisição forjada de outro site.',
                        'Preferências: tema e escolhas da interface.',
                        'Registro do seu consentimento de cookies, para não perguntarmos de novo a cada página.',
                    ]}
                />
            </Secao>

            <Secao titulo="3. Análise de uso — depende do seu sim">
                <p>
                    Contam quantas pessoas visitam e em que tela param, em números agregados. Servem
                    para decidir o que melhorar. Se você recusar, nada é coletado e o site continua
                    funcionando igual.
                </p>
            </Secao>

            <Secao titulo="4. Marketing — depende do seu sim">
                <p>
                    Medem o resultado de anúncios e permitem mostrar ofertas fora do site. Recusar
                    não tira nenhuma funcionalidade — você só deixa de ver anúncio direcionado.
                </p>
            </Secao>

            <Secao titulo="5. Como mudar sua escolha">
                <p>
                    A qualquer momento, em{' '}
                    <Link href="/meus-dados" className="text-yellow-400 underline underline-offset-2">
                        Meus dados
                    </Link>
                    , clicando em &ldquo;Rever escolha&rdquo;: o aviso reaparece e você decide de
                    novo. Revogar é tão simples quanto consentir, como manda o art. 8º, §5º.
                </p>
                <p>
                    Também dá para apagar cookies pelo próprio navegador — nas configurações de
                    privacidade de Chrome, Firefox, Safari ou Edge.
                </p>
            </Secao>

            <Secao titulo="6. Quanto tempo duram">
                <Lista
                    itens={[
                        'Cookie de sessão: apagado ao fechar o navegador.',
                        'Registro da sua escolha de cookies: 12 meses, ou até você revogar.',
                        'Análise e marketing: até 12 meses, quando autorizados.',
                    ]}
                />
                <p>
                    Quando o texto desta política muda de versão, sua escolha anterior deixa de
                    valer e perguntamos de novo — consentimento serve para a redação que você leu.
                </p>
            </Secao>
        </PaginaLegal>
    )
}
