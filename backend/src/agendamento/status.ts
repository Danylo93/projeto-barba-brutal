/**
 * Status de agendamento — função pura, sem Nest nem Prisma.
 *
 * A rota gravava no banco o texto que chegasse: "inventado", "" e até
 * "CANCELADO" em maiúscula entravam com 200. E maiúscula não é detalhe: os
 * relatórios comparam com `'cancelado'` minúsculo, então um atendimento
 * cancelado assim continuava contando como receita e pagando comissão.
 *
 * A tela do barbeiro só manda valores fixos, mas a API é pública para quem tem
 * chave, e é por ali que o n8n e o WhatsApp mexem na agenda.
 */

export const STATUS_VALIDOS = ['agendado', 'confirmado', 'cancelado', 'concluido'] as const;

export type StatusAgendamento = (typeof STATUS_VALIDOS)[number];

export const STATUS_INVALIDO = `Status inválido. Use um destes: ${STATUS_VALIDOS.join(', ')}.`;

/**
 * Devolve o status normalizado, ou `null` quando não serve.
 *
 * Aceita espaço nas pontas e maiúscula porque é erro de digitação de
 * integração, não outro status — mas grava sempre em minúscula, que é o que o
 * resto do sistema compara.
 */
export function normalizarStatus(valor: unknown): StatusAgendamento | null {
  if (typeof valor !== 'string') return null;

  const limpo = valor.trim().toLowerCase();
  return (STATUS_VALIDOS as readonly string[]).includes(limpo)
    ? (limpo as StatusAgendamento)
    : null;
}
