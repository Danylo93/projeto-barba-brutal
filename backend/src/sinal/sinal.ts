/**
 * Sinal: o cliente paga uma parte antes para o horário ficar reservado.
 *
 * Existe contra o furo — o horário marcado em que ninguém aparece, e que a
 * barbearia recusou outro cliente para segurar. Quem pagou R$ 15 adiantado
 * avisa quando não vai poder ir.
 *
 * O dinheiro NÃO passa pelo Barbearia Brutal. O Pix é gerado com a chave da
 * própria barbearia e cai direto na conta dela; o dono confirma o recebimento
 * no painel. Intermediar pagamento de terceiro é outra empresa, com outra
 * licença — e não é esta.
 */

export const SINAL_NAO_EXIGIDO = 'nao_exigido';
export const SINAL_PENDENTE = 'pendente';
export const SINAL_PAGO = 'pago';
export const SINAL_EXPIRADO = 'expirado';
export const SINAL_DISPENSADO = 'dispensado';

export type StatusDoSinal =
  | typeof SINAL_NAO_EXIGIDO
  | typeof SINAL_PENDENTE
  | typeof SINAL_PAGO
  | typeof SINAL_EXPIRADO
  | typeof SINAL_DISPENSADO;

export interface RegraDeSinal {
  sinalAtivo?: boolean | null;
  sinalPercent?: number | null;
  sinalMinimo?: number | null;
  sinalPrazoMinutos?: number | null;
  chavePix?: string | null;
}

/**
 * Quanto de sinal este agendamento pede. Zero = não pede.
 *
 * Sem chave Pix cadastrada o sinal é zero mesmo com a regra ligada: pedir
 * dinheiro sem dizer para onde mandar trava o agendamento sem cobrar nada de
 * ninguém. É o dono que precisa terminar a configuração, não o cliente que
 * precisa apanhar.
 */
export function calcularSinal(regra: RegraDeSinal, valorTotal: number): number {
  if (!regra?.sinalAtivo) return 0;
  if (!regra?.chavePix || !String(regra.chavePix).trim()) return 0;

  const total = Number(valorTotal);
  if (!Number.isFinite(total) || total <= 0) return 0;

  const percent = Number(regra.sinalPercent) || 0;
  const minimo = Number(regra.sinalMinimo) || 0;
  if (percent <= 0 && minimo <= 0) return 0;

  const doPercentual = (total * percent) / 100;
  const pedido = Math.max(doPercentual, minimo);

  // O sinal nunca passa do valor do serviço: 50% de mínimo R$ 30 num corte de
  // R$ 25 viraria cobrar mais adiantado do que o atendimento inteiro custa.
  return Number(Math.min(pedido, total).toFixed(2));
}

/** Em que estado o agendamento nasce. */
export function statusInicial(valorDoSinal: number): StatusDoSinal {
  return valorDoSinal > 0 ? SINAL_PENDENTE : SINAL_NAO_EXIGIDO;
}

/** Até quando o horário fica preso esperando o Pix. */
export function prazoParaPagar(regra: RegraDeSinal, agora = new Date()): Date {
  const minutos = Number(regra?.sinalPrazoMinutos);
  const validos = Number.isFinite(minutos) && minutos > 0 ? minutos : 30;
  return new Date(agora.getTime() + validos * 60_000);
}

/** O prazo acabou e o Pix não caiu? */
export function sinalExpirou(
  agendamento: { sinalStatus?: string | null; sinalExpiraEm?: Date | string | null },
  agora = new Date(),
): boolean {
  if (agendamento?.sinalStatus !== SINAL_PENDENTE) return false;
  if (!agendamento.sinalExpiraEm) return false;
  return new Date(agendamento.sinalExpiraEm).getTime() <= agora.getTime();
}

/**
 * Este horário está de pé?
 *
 * Sinal pendente ainda segura o horário — é justamente o prazo que o cliente
 * tem para pagar. O que libera a agenda é o sinal EXPIRAR.
 */
export function horarioEstaSegurado(
  agendamento: { sinalStatus?: string | null; sinalExpiraEm?: Date | string | null },
  agora = new Date(),
): boolean {
  if (agendamento?.sinalStatus === SINAL_EXPIRADO) return false;
  return !sinalExpirou(agendamento, agora);
}

/** Falta pagar para o horário estar garantido? */
export function aguardandoPagamento(agendamento: { sinalStatus?: string | null }): boolean {
  return agendamento?.sinalStatus === SINAL_PENDENTE;
}

/**
 * Pedaço de `where` do Prisma que deixa de fora os horários que o sinal
 * soltou.
 *
 * Fica aqui junto da regra, e não escrito à mão em cada consulta, porque a
 * pergunta "este horário ainda está ocupado?" tem que ter UMA resposta. Se a
 * checagem de conflito e a tela de horários livres divergirem, o cliente vê
 * um horário vago e leva "já tem atendimento" na cara ao confirmar.
 *
 * Um horário sai da agenda quando o sinal foi marcado como expirado OU
 * quando o prazo passou e ninguém marcou ainda — a varredura pode estar
 * atrasada, e a agenda não pode ficar presa esperando por ela.
 */
export function soHorariosDePe(agora = new Date()) {
  return {
    AND: [
      { NOT: { sinalStatus: SINAL_EXPIRADO } },
      {
        NOT: {
          AND: [{ sinalStatus: SINAL_PENDENTE }, { sinalExpiraEm: { lt: agora } }],
        },
      },
    ],
  };
}

/**
 * O texto que o cliente lê.
 *
 * Fica aqui, e não na tela, porque o robô do WhatsApp e o painel precisam
 * dizer a mesma coisa — e porque "o horário só é seu depois do Pix" é o
 * ponto inteiro da funcionalidade.
 */
export function avisoDoSinal(valor: number, minutos: number): string {
  return (
    `Para garantir o horário, falta um sinal de ${reais(valor)}. ` +
    `O Pix cai direto na conta da barbearia e o horário fica reservado por ${minutos} minutos.`
  );
}

function reais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}
