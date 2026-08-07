/**
 * Quando convidar a barbearia a escolher um plano — e quando calar a boca.
 *
 * Antes disto, plano vencido fechava o painel: um modal sem botão de fechar
 * por cima de tudo, e a API respondendo 403 em todas as rotas. O dono não via
 * a agenda de amanhã nem a lista de clientes. Quem chega por anúncio, testa e
 * bate nessa parede no dia 31 não assina — desinstala.
 *
 * Agora o acesso continua e o que aparece é convite. Convite tem regra: não
 * pode aparecer na tela onde a pessoa já está resolvendo, e não pode voltar
 * na cara dela a cada clique depois de ela ter dito "agora não".
 */

/** Telas onde o convite não aparece: a pessoa já está lá para resolver isso. */
const ROTAS_DE_RESOLUCAO = ['/planos', '/assinatura'];

export interface EstadoDoConvite {
  /** A assinatura está inativa, vencida ou não existe? Quem decide é a API. */
  inativa: boolean;
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

/**
 * Mostrar o modal agora?
 *
 * Só a primeira vez em cada sessão. Depois disso fica a faixa, que é discreta
 * e não atrapalha o trabalho — insistir com modal a cada navegação não vende
 * plano nenhum, só ensina a pessoa a clicar no X sem ler.
 */
export function deveAbrirOConvite(estado: EstadoDoConvite): boolean {
  if (estado.carregando || estado.erro || !estado.inativa) return false;
  if (estado.dispensadoNaSessao) return false;
  return !estaEmRotaDeResolucao(estado.rota);
}

/** A faixa fica enquanto o plano estiver inativo, mesmo depois do "agora não". */
export function deveMostrarAFaixa(estado: EstadoDoConvite): boolean {
  if (estado.carregando || estado.erro || !estado.inativa) return false;
  return !estaEmRotaDeResolucao(estado.rota);
}
