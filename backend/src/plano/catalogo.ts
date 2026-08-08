/**
 * O catálogo de planos: preço, limite e o que cada um libera.
 *
 * Este arquivo é a única fonte. O seed cria a partir dele, o script de
 * repreço atualiza a partir dele e a landing mostra o que a API devolve —
 * ninguém digita preço em tela.
 *
 * Mudar preço aqui NÃO mexe em quem já assina: a assinatura recorrente do
 * Mercado Pago nasce com o valor congelado no momento da contratação
 * (`corpoDaAssinatura`), então reajuste vale para contrato novo. Para valer
 * no antigo, seria preciso cancelar e recontratar — de propósito não fazemos
 * isso sozinhos.
 */

/** Sem teto de verdade. Um número, e não `null`, porque as colunas são Int. */
export const SEM_LIMITE = 999999;

export type Periodicidade = 'mensal' | 'anual';
export type GrupoDePlano = 'basico' | 'profissional' | 'premium';

/**
 * Quantos meses se paga no plano anual.
 *
 * Dez, e não doze: dois meses de desconto é o que faz alguém pagar um ano
 * adiantado. O número mora aqui porque ele aparece na landing ("2 meses
 * grátis") e no preço — e os dois têm que contar a mesma história.
 */
export const MESES_COBRADOS_NO_ANUAL = 10;

export interface PlanoDoCatalogo {
  grupo: GrupoDePlano;
  nome: string;
  descricao: string;
  precoMensal: number;
  maxUsuarios: number;
  maxAgendamentos: number;
  features: string[];
}

/**
 * Os três planos.
 *
 * O eixo é o NÚMERO DE PROFISSIONAIS, como o mercado faz. A Trinks cobra por
 * faixa (1-2, 3-4, 5-10, 11-20, 21+), a Booksy cobra um fixo mais um valor por
 * membro extra, a Fresha cobra por profissional agendável. Todas escalonam por
 * cadeira, e por um motivo simples: cadeira é o que cresce junto com o
 * faturamento da barbearia, então o preço acompanha a capacidade de pagar.
 *
 * Antes daqui os três planos eram 1 / ilimitado / ilimitado. Profissional e
 * Premium tinham EXATAMENTE o mesmo teto, e os R$ 30 de diferença compravam
 * "sinal no agendamento" e "suporte prioritário" — sem degrau de capacidade
 * nenhum. É por isso que a diferença parecia arbitrária: ela era.
 *
 * O teto de AGENDAMENTOS continua fora de todos, e isso é de propósito. Ele
 * existia como 200/mês no Básico e o efeito era o pior possível: a barbearia
 * batia o teto no dia 20 e a API recusava agendamento no meio do mês, justo
 * quando o mês estava indo bem. Cobra-se por cadeira, não por movimento.
 */
export const CATALOGO: PlanoDoCatalogo[] = [
  {
    grupo: 'basico',
    nome: 'Básico',
    descricao: 'Para quem trabalha sozinho',
    precoMensal: 49.9,
    maxUsuarios: 1,
    maxAgendamentos: SEM_LIMITE,
    features: [
      '1 profissional',
      'Agendamentos ilimitados',
      'Página de agendamento da sua barbearia',
      'Agendamento sem cadastro',
      'Confirmação e lembrete no WhatsApp',
      'Gestão de clientes',
      'Produtos e estoque',
      'Relatórios básicos',
    ],
  },
  {
    grupo: 'profissional',
    nome: 'Profissional',
    descricao: 'Para a barbearia com equipe',
    precoMensal: 69.9,
    // Cinco é a faixa que o mercado usa para "barbearia com equipe" — a Trinks
    // separa 3-4 de 5-10 exatamente aí. Acima disso a operação muda de tamanho
    // e passa a ser Premium.
    maxUsuarios: 5,
    maxAgendamentos: SEM_LIMITE,
    features: [
      'Até 5 profissionais',
      'Agendamentos ilimitados',
      'Página de agendamento da sua barbearia',
      'Agendamento sem cadastro',
      'Confirmação e lembrete no WhatsApp',
      'Robô de WhatsApp que marca, remarca e cancela',
      'Atendimento recorrente',
      'Comissão por profissional',
      'Bloqueio de horário: folga, almoço e férias',
      'Produtos e estoque',
      'Relatórios avançados',
    ],
  },
  {
    grupo: 'premium',
    nome: 'Premium',
    descricao: 'Para barbearia grande, com mais de cinco cadeiras',
    precoMensal: 99.9,
    maxUsuarios: SEM_LIMITE,
    maxAgendamentos: SEM_LIMITE,
    // Escrito por extenso, e não como "Tudo do Profissional".
    //
    // Esta lista não é só texto de vitrine: o `FeatureGuard` procura dentro
    // dela a palavra da rota. Quando o Premium dizia apenas "Tudo do
    // Profissional", nenhuma linha continha "agendamentos" — e o plano MAIS
    // CARO passou a levar 403 em toda rota de agendamento. Pior: no teste
    // grátis todo mundo recebe o Premium, então barbearia nova nascia sem
    // conseguir marcar nada.
    features: [
      'Profissionais ilimitados',
      'Agendamentos ilimitados',
      'Página de agendamento da sua barbearia',
      'Agendamento sem cadastro',
      'Confirmação e lembrete no WhatsApp',
      'Robô de WhatsApp que marca, remarca e cancela',
      'Atendimento recorrente',
      'Comissão por profissional',
      'Bloqueio de horário: folga, almoço e férias',
      'Produtos e estoque',
      'Sinal no agendamento',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
];
/** Preço do ano inteiro, pago de uma vez. */
export function precoAnual(precoMensal: number): number {
  return Number((precoMensal * MESES_COBRADOS_NO_ANUAL).toFixed(2));
}

/** Quanto se economiza pagando o ano — o número que a tela mostra. */
export function economiaAnual(precoMensal: number): number {
  return Number((precoMensal * 12 - precoAnual(precoMensal)).toFixed(2));
}

/** Quantos dias vale cada periodicidade. */
export function duracaoEmDias(periodicidade: Periodicidade): number {
  return periodicidade === 'anual' ? 365 : 30;
}

/**
 * Até quando vale uma assinatura deste plano.
 *
 * Existe porque a validade estava escrita como `+ 30 dias` em quatro pontos
 * do serviço de assinatura — ativação, upgrade, webhook de autorização e
 * webhook de cobrança. Com plano anual isso é dinheiro do cliente indo
 * embora: ele paga dez meses adiantado e a assinatura vence em trinta dias.
 *
 * `duracao` nulo cai em 30 para não deixar plano antigo sem validade.
 */
export function vigenciaAte(
  plano: { duracao?: number | null } | null | undefined,
  apartirDe: Date = new Date(),
): Date {
  const dias = Number(plano?.duracao) > 0 ? Number(plano!.duracao) : 30;
  const fim = new Date(apartirDe);
  fim.setDate(fim.getDate() + dias);
  return fim;
}

/** "Premium" + anual → "Premium Anual". */
export function nomeDoPlano(base: string, periodicidade: Periodicidade): string {
  return periodicidade === 'anual' ? `${base} Anual` : base;
}

/**
 * A chave canônica de um plano, para decidir o que ele libera.
 *
 * Existe porque a regra do robô e a do painel liam o NOME do plano. No dia em
 * que nasceu "Profissional Anual", esse nome deixou de bater com
 * 'profissional' e a barbearia que pagou um ano adiantado ficaria sem robô —
 * o plano mais caro entregando menos que o mensal. O `grupo` é o que
 * atravessa a periodicidade; o nome só entra como reserva para as linhas
 * antigas, que ainda não têm grupo.
 */
export function chaveDoPlano(
  plano: { grupo?: string | null; nome?: string | null } | null | undefined,
): string {
  if (!plano) return '';
  const grupo = String(plano.grupo ?? '').trim().toLowerCase();
  if (grupo) return grupo;

  return String(plano.nome ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+(anual|mensal)$/, '')
    .trim();
}

/** Linhas prontas para o banco: os três planos, nas duas periodicidades. */
export function linhasDoCatalogo() {
  const linhas: Array<{
    nome: string;
    descricao: string;
    preco: number;
    duracao: number;
    maxUsuarios: number;
    maxAgendamentos: number;
    features: string[];
    periodicidade: Periodicidade;
    grupo: GrupoDePlano;
  }> = [];

  for (const plano of CATALOGO) {
    for (const periodicidade of ['mensal', 'anual'] as const) {
      linhas.push({
        nome: nomeDoPlano(plano.nome, periodicidade),
        descricao: plano.descricao,
        preco:
          periodicidade === 'anual'
            ? precoAnual(plano.precoMensal)
            : plano.precoMensal,
        duracao: duracaoEmDias(periodicidade),
        maxUsuarios: plano.maxUsuarios,
        maxAgendamentos: plano.maxAgendamentos,
        features: plano.features,
        periodicidade,
        grupo: plano.grupo,
      });
    }
  }

  return linhas;
}
