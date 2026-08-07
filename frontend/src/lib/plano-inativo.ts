/**
 * Quando convidar a barbearia a escolher um plano — e com que insistência.
 *
 * Antes disto, plano vencido fechava o painel: um modal sem botão de fechar
 * por cima de tudo, e a API respondendo 403 em todas as rotas. Quem chega por
 * anúncio, testa e bate nessa parede no último dia não assina — desinstala.
 *
 * Agora o acesso continua e o que aparece é convite. Mas convite tem dois
 * tons, e a diferença entre eles é quem está do outro lado:
 *
 * - **quem ainda não escolheu plano** acabou de se cadastrar e está montando a
 *   barbearia. Encher essa pessoa de modal atrapalha justamente o trabalho que
 *   faz ela querer ficar. Para ela, o convite aparece uma vez por sessão.
 * - **quem JÁ teve plano e ele venceu** já viu o produto inteiro funcionando e
 *   escolheu não pagar. Aí o convite volta a cada tela, até a compra. Ele
 *   continua fechando — o acesso não se perde —, mas não some de vista.
 */

/** Telas onde o convite não aparece: a pessoa já está lá para resolver isso. */
const ROTAS_DE_RESOLUCAO = ['/planos', '/assinatura'];

export interface EstadoDoConvite {
  /** A assinatura está inativa, vencida ou não existe? Quem decide é a API. */
  inativa: boolean;
  /**
   * Já teve plano e ele não vale mais — teste que acabou, assinatura vencida,
   * cancelada ou com pagamento pendente. É o que separa o convite insistente
   * do discreto.
   */
  planoExpirado: boolean;
  /** Ainda estamos buscando — não pisque um modal antes de saber. */
  carregando: boolean;
  /** Não deu para saber. Na dúvida, não incomoda. */
  erro: boolean;
  /** Caminho da tela atual. */
  rota: string;
  /** A pessoa já fechou o convite nesta sessão? */
  dispensadoNaSessao: boolean;
}

export function estaEmRotaDeResolucao(rota: string): boolean {
  return ROTAS_DE_RESOLUCAO.some((r) => String(rota ?? '').startsWith(r));
}

/** Nada a convidar: plano em dia, ainda carregando, ou deu erro na leitura. */
function naoCabeConvite(estado: EstadoDoConvite): boolean {
  return (
    estado.carregando ||
    estado.erro ||
    !estado.inativa ||
    estaEmRotaDeResolucao(estado.rota)
  );
}

/**
 * Mostrar o modal agora?
 *
 * Com plano vencido ele volta em cada tela, ignorando o "agora não" — é o
 * pedido explícito: quem já usou o teste inteiro e não comprou continua sendo
 * lembrado até comprar. Sem plano nenhum ainda, só a primeira vez da sessão.
 */
export function deveAbrirOConvite(estado: EstadoDoConvite): boolean {
  if (naoCabeConvite(estado)) return false;
  if (estado.planoExpirado) return true;
  return !estado.dispensadoNaSessao;
}

/** A faixa fica enquanto o plano estiver inativo, mesmo depois do "agora não". */
export function deveMostrarAFaixa(estado: EstadoDoConvite): boolean {
  return !naoCabeConvite(estado);
}

/**
 * O texto muda com a situação.
 *
 * Dizer "escolha um plano" para quem acabou de ver o teste vencer soa como se
 * o sistema não soubesse o que aconteceu. E dizer "seu plano venceu" para quem
 * nunca teve plano é pior ainda — parece cobrança de uma dívida que não
 * existe.
 */
export function textoDoConvite(planoExpirado: boolean): {
  etiqueta: string;
  titulo: string;
  corpo: string;
} {
  if (planoExpirado) {
    return {
      etiqueta: 'Plano vencido',
      titulo: 'Seu acesso completo acabou',
      corpo:
        'Sua barbearia continua aqui — agenda, clientes e histórico, tudo no lugar. ' +
        'Para voltar a ter o atendente no WhatsApp, a equipe sem limite e os relatórios ' +
        'completos, é só escolher um plano.',
    };
  }
  return {
    etiqueta: 'Sem plano ativo',
    titulo: 'Escolha um plano e destrave tudo',
    corpo:
      'Sua barbearia continua funcionando — agenda, clientes e serviços estão todos aí. ' +
      'Com um plano ativo você libera o atendente no WhatsApp, a equipe sem limite e os ' +
      'relatórios completos.',
  };
}
