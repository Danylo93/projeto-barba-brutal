/**
 * "Todo sábado às 10h": a regra que gera as datas de uma série.
 *
 * Tudo aqui é função pura sobre datas, e todas as datas são pensadas no fuso
 * de Brasília. Isso importa mais do que parece: o que se repete é a HORA DO
 * RELÓGIO, não um intervalo fixo de milissegundos. Somar `7 * 24 * 60 * 60000`
 * funciona até o país mexer no horário — e aí a série inteira anda uma hora e
 * o cliente aparece na porta no horário errado.
 */

export const FUSO_BRASILIA = 'America/Sao_Paulo';

export const FREQUENCIAS = ['semanal', 'quinzenal', 'mensal'] as const;
export type Frequencia = (typeof FREQUENCIAS)[number];

export function frequenciaValida(valor: unknown): valor is Frequencia {
  return FREQUENCIAS.includes(String(valor) as Frequencia);
}

/** Quantos dias até a próxima ocorrência. Mensal é tratado à parte. */
export function diasEntreOcorrencias(frequencia: Frequencia): number {
  if (frequencia === 'semanal') return 7;
  if (frequencia === 'quinzenal') return 14;
  return 28; // mensal: quatro semanas mantém o dia da semana
}

const HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "9:30" e "09:30" valem; "25:00" e "abc" não. */
export function horaValida(valor: unknown): boolean {
  return HORA.test(String(valor ?? '').trim());
}

/** O dia civil em Brasília, como "2026-08-08". */
export function diaEmBrasilia(data: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

/** Dia da semana em Brasília: 0 domingo … 6 sábado. */
export function diaSemanaEmBrasilia(data: Date): number {
  const dia = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_BRASILIA,
    weekday: 'short',
  }).format(data);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dia);
}

/**
 * Junta "2026-08-08" + "15:00" no instante certo.
 *
 * O `-03:00` é escrito na mão porque o Brasil não tem mais horário de verão;
 * se voltar a ter, este é o ponto único a mudar — e o teste que fixa a
 * conversão vai falhar antes de o cliente aparecer na hora errada.
 */
export function instanteEmBrasilia(dia: string, hora: string): Date {
  const [, h, m] = HORA.exec(String(hora).trim()) ?? [];
  if (!h) throw new Error(`Hora inválida: ${hora}`);
  return new Date(`${dia}T${h.padStart(2, '0')}:${m}:00-03:00`);
}

/** Soma dias no calendário civil, sem cair na armadilha do fuso. */
export function somarDias(dia: string, dias: number): string {
  const meioDia = new Date(`${dia}T12:00:00-03:00`);
  meioDia.setDate(meioDia.getDate() + dias);
  return diaEmBrasilia(meioDia);
}

/**
 * O primeiro dia, a partir de `apartirDe`, que cai no dia da semana pedido.
 *
 * Se hoje já é o dia certo, hoje conta — desde que a hora ainda não tenha
 * passado. Marcar uma série "toda quinta às 10h" numa quinta às 15h e ver a
 * primeira ocorrência nascer no passado é o tipo de coisa que faz o dono
 * desconfiar do sistema inteiro.
 */
export function primeiroDia(
  diaSemana: number,
  hora: string,
  apartirDe: Date = new Date(),
): string {
  let dia = diaEmBrasilia(apartirDe);

  if (diaSemanaEmBrasilia(apartirDe) === diaSemana) {
    if (instanteEmBrasilia(dia, hora).getTime() > apartirDe.getTime()) return dia;
    dia = somarDias(dia, 1);
  }

  for (let i = 0; i < 7; i++) {
    if (diaSemanaEmBrasilia(instanteEmBrasilia(dia, '12:00')) === diaSemana) return dia;
    dia = somarDias(dia, 1);
  }

  // Inalcançável com um dia da semana válido, mas melhor gritar do que
  // devolver silêncio.
  throw new Error(`Dia da semana inválido: ${diaSemana}`);
}

export interface Serie {
  frequencia: Frequencia;
  diaSemana: number;
  hora: string;
  /** Última ocorrência já criada. */
  geradoAte?: Date | string | null;
  /** Fim da série. Nulo = sem prazo. */
  ate?: Date | string | null;
}

/**
 * As próximas datas a criar, no máximo `quantas`.
 *
 * A série é materializada com antecedência para o conflito aparecer NA HORA
 * de marcar — não no sábado de manhã, com dois clientes na porta. Mas não
 * até o fim dos tempos: quem cancela em março não pode deixar cem horários
 * fantasmas até dezembro.
 */
export function proximasOcorrencias(
  serie: Serie,
  quantas: number,
  agora: Date = new Date(),
): Date[] {
  if (!frequenciaValida(serie.frequencia)) return [];
  if (!horaValida(serie.hora)) return [];
  if (!Number.isInteger(serie.diaSemana) || serie.diaSemana < 0 || serie.diaSemana > 6) {
    return [];
  }

  const passo = diasEntreOcorrencias(serie.frequencia);
  const limite = serie.ate ? new Date(serie.ate) : null;

  // De onde continuar: da última gerada, ou do primeiro dia válido.
  let dia: string;
  if (serie.geradoAte) {
    const ultima = new Date(serie.geradoAte);
    dia = somarDias(diaEmBrasilia(ultima), passo);
  } else {
    dia = primeiroDia(serie.diaSemana, serie.hora, agora);
  }

  const datas: Date[] = [];
  for (let i = 0; i < quantas; i++) {
    const quando = instanteEmBrasilia(dia, serie.hora);
    if (limite && quando.getTime() > limite.getTime()) break;
    // Uma série retomada depois de meses não pode despejar o passado na
    // agenda.
    if (quando.getTime() > agora.getTime()) datas.push(quando);
    dia = somarDias(dia, passo);
  }

  return datas;
}

/** Como a série se lê no painel: "Toda semana, sábado às 10:00". */
export function descreverSerie(serie: Serie): string {
  const dias = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  const cadencia = {
    semanal: 'Toda semana',
    quinzenal: 'A cada 15 dias',
    mensal: 'Todo mês',
  }[serie.frequencia];

  return `${cadencia}, ${dias[serie.diaSemana] ?? '?'} às ${serie.hora}`;
}
