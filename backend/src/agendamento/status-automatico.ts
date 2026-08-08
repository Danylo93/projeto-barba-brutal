import { duracaoEmMinutos, fimDoAtendimento } from './agendamento.validacao';

export const STATUS_DE_HORARIO_ATIVO = ['agendado', 'confirmado'] as const;

export interface AgendamentoComDuracao {
  id: number;
  data: Date | string;
  servicos: Array<{ qtdeSlots?: number | null }>;
}

/**
 * Um horário só encerra depois do fim dos serviços, não quando eles começam.
 * Um corte de uma hora marcado às 15h continua ativo até as 16h.
 */
export function horarioJaTerminou(
  agendamento: AgendamentoComDuracao,
  agora = new Date(),
): boolean {
  const inicio = new Date(agendamento.data);
  if (Number.isNaN(inicio.getTime())) return false;
  return fimDoAtendimento({
    inicio,
    duracaoMin: duracaoEmMinutos(agendamento.servicos ?? []),
  }).getTime() <= agora.getTime();
}

/**
 * Troca horários vencidos por `expirado` com uma escrita idempotente.
 *
 * Não usa `concluido`: esse status confirma que o serviço aconteceu e pode
 * gerar comissão e lembrete de retorno. Horário passado, sozinho, não prova
 * presença do cliente. O barbeiro pode transformar `expirado` em `concluido`.
 */
export async function encerrarHorariosUltrapassados(
  prisma: any,
  filtro: Record<string, unknown> = {},
  agora = new Date(),
): Promise<number> {
  const candidatos: AgendamentoComDuracao[] = await prisma.agendamento.findMany({
    where: {
      ...filtro,
      status: { in: [...STATUS_DE_HORARIO_ATIVO] },
      data: { lte: agora },
    },
    select: {
      id: true,
      data: true,
      servicos: { select: { qtdeSlots: true } },
    },
  });
  const ids = candidatos
    .filter((agendamento) => horarioJaTerminou(agendamento, agora))
    .map((agendamento) => agendamento.id);

  if (!ids.length) return 0;
  const resultado = await prisma.agendamento.updateMany({
    where: {
      id: { in: ids },
      status: { in: [...STATUS_DE_HORARIO_ATIVO] },
    },
    data: { status: 'expirado' },
  });
  return Number(resultado?.count ?? 0);
}
