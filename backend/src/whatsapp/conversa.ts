/**
 * O que o robô de WhatsApp responde — funções puras, sem Nest e sem Prisma.
 *
 * Duas coisas moram aqui, e as duas existem por um motivo concreto.
 *
 * A primeira é o fuso. O cliente escreve "amanhã às 15h" e o fluxo monta
 * "2026-08-07T15:00". Sem fuso na ponta, o `new Date()` do Node usa o fuso do
 * SERVIDOR — e o servidor no Render está em UTC. As 15h do cliente viravam
 * meio-dia em Brasília, silenciosamente, com a API respondendo 200. Ele
 * receberia a confirmação de um horário que nunca pediu.
 *
 * A segunda é a recusa. Quando não dá para remarcar, o cliente precisa ler o
 * motivo em português, do jeito que uma pessoa diria — e principalmente saber
 * o que fazer em seguida. "Bad Request" não é resposta de atendimento.
 */

/** Brasília é UTC-3 o ano inteiro desde 2019 — não há mais horário de verão. */
const OFFSET_BRASILIA = '-03:00';
const FUSO_BRASILIA = 'America/Sao_Paulo';

export const MINUTOS_POR_SLOT = 30;

/**
 * Antecedência mínima para marcar pelo WhatsApp.
 *
 * Quinze minutos: menos que isso o cliente sai de casa e o horário já era, e o
 * barbeiro não tem tempo de ver a mensagem chegar.
 */
export const MINUTOS_DE_ANTECEDENCIA = 15;

/** Texto no formato que o cliente lê: "07/08 às 15:00". */
export function comoOClienteLe(data: Date): string {
  const dia = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_BRASILIA,
    day: '2-digit',
    month: '2-digit',
  }).format(data);
  return `${dia} às ${horaEmBrasilia(data)}`;
}

/** Só a hora, "15:00", no fuso da barbearia. */
export function horaEmBrasilia(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_BRASILIA,
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

/** "2026-08-07" no fuso da barbearia — o dia que o cliente chama de hoje. */
export function diaEmBrasilia(data: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

/**
 * Uma data que ainda faz sentido para uma barbearia marcar.
 *
 * O ano 9999 fazia o Prisma estourar ao somar o fuso e virar 500. Cinco anos
 * é folga de sobra para quem marca corte de cabelo.
 */
const ANOS_DE_ALCANCE = 5;

/** Só é fuso escrito o que termina em `Z` ou em `±hh:mm`/`±hhmm`. */
const TEM_FUSO_ESCRITO = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Lê a data que o fluxo mandou, assumindo Brasília quando não vem fuso.
 *
 * Aceita o que aparece na prática: `2026-08-07`, `2026-8-7 15:00`,
 * `07/08/2026 15:00:00`, com `T` ou espaço, com ou sem segundos — e ISO com
 * fuso escrito, que manda em cima de tudo.
 *
 * O que NÃO faz é cair no `new Date(texto)` para uma data sem fuso. Esse era o
 * furo: `"2026-8-13 15:00"` não casava com a expressão daqui, ia para o
 * construtor do Date e virava 15h **do servidor** — meio-dia em Brasília, com
 * a API respondendo 201. O cliente aparecia às 15h e o barbeiro tinha outra
 * pessoa na cadeira. Agora, sem fuso escrito, ou casa aqui ou é `null`.
 */
export function instanteEmBrasilia(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : dentroDoAlcance(valor);
  }
  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  // 07/08/2026, 7-8-2026 15:00, 07/08/2026 15:00:00
  const brasileiro = texto.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (brasileiro) {
    const [, d, m, a, h = '0', min = '0'] = brasileiro;
    return montar(a, m, d, h, min);
  }

  // 2026-08-07, 2026-8-7T15:00, 2026-08-07 15:00:00
  const iso = texto.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (iso) {
    const [, a, m, d, h = '0', min = '0'] = iso;
    return montar(a, m, d, h, min);
  }

  // Fuso escrito é o único caso em que o construtor do Date pode decidir: ali
  // ele não tem o que chutar.
  if (TEM_FUSO_ESCRITO.test(texto)) {
    const comFuso = new Date(texto);
    return Number.isNaN(comFuso.getTime()) ? null : dentroDoAlcance(comFuso);
  }

  return null;
}

function montar(a: string, m: string, d: string, h: string, min: string): Date | null {
  const pad = (v: string, n = 2) => v.padStart(n, '0');
  const montada = new Date(
    `${pad(a, 4)}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00${OFFSET_BRASILIA}`,
  );
  if (Number.isNaN(montada.getTime())) return null;
  // 31/02 vira 03/03 no construtor do Date, e 25:00 vira o dia seguinte. Data
  // que não existe é erro de digitação do cliente, e ele precisa ouvir isso em
  // vez de ser mandado para outro dia sem saber.
  const [aa, mm, dd] = diaEmBrasilia(montada).split('-');
  if (Number(aa) !== Number(a) || Number(mm) !== Number(m) || Number(dd) !== Number(d)) {
    return null;
  }
  if (horaEmBrasilia(montada) !== `${pad(h)}:${pad(min)}`) return null;
  return dentroDoAlcance(montada);
}

function dentroDoAlcance(data: Date): Date | null {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() + ANOS_DE_ALCANCE);
  if (data.getTime() > limite.getTime()) return null;
  // Antes de 2000 não é agenda de barbearia, é lixo — e o Prisma não gosta de
  // data negativa.
  if (data.getFullYear() < 2000) return null;
  return data;
}

/** Mesmo dia do calendário, do ponto de vista de quem está em Brasília. */
export function noMesmoDia(a: Date, b: Date): boolean {
  return diaEmBrasilia(a) === diaEmBrasilia(b);
}

export interface AgendamentoParaRemarcar {
  status?: string | null;
  data?: Date | string | null;
}

/**
 * Por que este pedido de remarcação não pode ser atendido — em português, para
 * o cliente ler no WhatsApp. `null` quer dizer "pode seguir".
 *
 * A ordem importa: o motivo mais específico primeiro. O cliente que pede um
 * horário de hoje que já passou precisa ouvir *isso*, e não "não é possível
 * agendar em um horário que já passou", que é a mesma frase para quem digitou
 * o ano errado.
 */
export function porqueNaoDaParaRemarcar(
  agendamento: AgendamentoParaRemarcar,
  novaDataTexto: unknown,
  agora: Date = new Date(),
): string | null {
  const status = String(agendamento?.status ?? '').trim().toLowerCase();

  if (status === 'cancelado') {
    return 'Esse agendamento foi cancelado, então não dá para remarcar. Quer que eu marque um horário novo?';
  }
  if (status === 'concluido') {
    return 'Esse atendimento já foi realizado. Se quiser voltar, marco um novo horário para você.';
  }

  if (novaDataTexto === undefined || novaDataTexto === null || String(novaDataTexto).trim() === '') {
    return 'Me diz para qual dia e horário você quer mudar, por favor. Pode ser assim: 07/08 às 15:00.';
  }

  const nova = instanteEmBrasilia(novaDataTexto);
  if (!nova) {
    return 'Não consegui entender essa data. Me manda no formato dia/mês e hora — por exemplo, 07/08 às 15:00.';
  }

  const limite = new Date(agora.getTime() + MINUTOS_DE_ANTECEDENCIA * 60000);

  if (nova.getTime() < agora.getTime()) {
    // O caso que mais acontece: o cliente lembra de remarcar no fim do dia e
    // pede um horário da manhã.
    if (noMesmoDia(nova, agora)) {
      return `Esse horário de hoje já passou — agora são ${horaEmBrasilia(
        agora,
      )}. Me diz um horário mais tarde de hoje ou outro dia que eu vejo o que tenho livre.`;
    }
    return `Esse dia já passou. Me diz uma data de hoje em diante que eu vejo os horários livres.`;
  }

  if (nova.getTime() < limite.getTime()) {
    return `Para hoje eu só consigo marcar com pelo menos ${MINUTOS_DE_ANTECEDENCIA} minutos de antecedência. Escolhe um horário a partir das ${horaEmBrasilia(
      limite,
    )}, por favor.`;
  }

  const atual = agendamento?.data ? instanteEmBrasilia(agendamento.data) : null;
  if (atual && atual.getTime() === nova.getTime()) {
    return `Esse já é o horário do seu agendamento (${comoOClienteLe(
      atual,
    )}). Se quiser outro, é só me dizer qual.`;
  }

  return null;
}

/**
 * Horários livres de um dia, em passos de 30 min.
 *
 * Existe porque um robô que não sabe o que está livre só sabe errar: ele chuta
 * um horário, a API recusa, e o cliente recebe uma negativa atrás da outra sem
 * nunca ouvir uma opção. Atendente de verdade responde "tenho 15h ou 16h30".
 *
 * `duracaoMin` importa: um combo de 1h não cabe às 17h30 numa barbearia que
 * fecha às 18h, mesmo com as 17h30 livres.
 */
export function horariosLivres(opcoes: {
  /** Abertura e fechamento do dia, em horas decimais (ex.: 9 e 18.5). */
  expediente: { aberto: boolean; abertura: number; fechamento: number } | null;
  /** Dia procurado, "2026-08-07". */
  dia: string;
  /** Duração total do atendimento, em minutos. */
  duracaoMin: number;
  /** Intervalos já tomados (agendamentos e bloqueios). */
  ocupados: Array<{ inicio: Date; fim: Date }>;
  agora?: Date;
}): string[] {
  const { expediente, dia, duracaoMin, ocupados } = opcoes;
  const agora = opcoes.agora ?? new Date();
  if (!expediente || expediente.aberto === false) return [];

  const livres: string[] = [];
  const limite = new Date(agora.getTime() + MINUTOS_DE_ANTECEDENCIA * 60000);

  const primeiro = Math.ceil(expediente.abertura * 60);
  const ultimo = Math.floor(expediente.fechamento * 60);

  for (let minuto = primeiro; minuto + duracaoMin <= ultimo; minuto += MINUTOS_POR_SLOT) {
    const hh = String(Math.floor(minuto / 60)).padStart(2, '0');
    const mm = String(minuto % 60).padStart(2, '0');
    const inicio = new Date(`${dia}T${hh}:${mm}:00${OFFSET_BRASILIA}`);
    if (Number.isNaN(inicio.getTime())) continue;

    // Horário que já passou não é opção, e nem os minutos de antecedência.
    if (inicio.getTime() < limite.getTime()) continue;

    const fim = new Date(inicio.getTime() + duracaoMin * 60000);
    const batendo = ocupados.some((o) => inicio < o.fim && o.inicio < fim);
    if (batendo) continue;

    livres.push(`${hh}:${mm}`);
  }

  return livres;
}

/**
 * Os planos em que o robô atende.
 *
 * O robô é o argumento de venda dos planos pagos mais caros — deixá-lo aberto
 * a todo mundo tira o motivo de subir de plano. Antes não havia checagem
 * nenhuma: bastava a barbearia configurar a instância da Evolution.
 */
export const PLANOS_COM_ROBO = ['profissional', 'premium'] as const;

export const ROBO_FORA_DO_PLANO =
  'O atendimento por WhatsApp está disponível nos planos Profissional e Premium.';

/** O plano desta barbearia inclui o robô? */
export function planoTemRobo(plano: { nome?: string | null; features?: string[] | null } | null): boolean {
  if (!plano) return false;

  const nome = String(plano.nome ?? '').trim().toLowerCase();
  if ((PLANOS_COM_ROBO as readonly string[]).includes(nome)) return true;

  // A feature escrita à mão também vale: o dono do SaaS pode liberar o robô
  // para um plano sob medida sem mexer em código.
  return (plano.features ?? []).some((f) =>
    String(f).toLowerCase().includes('whatsapp'),
  );
}

/** Um serviço do cardápio, como o robô precisa ler. */
export interface ServicoDoCardapio {
  id: number;
  nome: string;
  [extra: string]: unknown;
}

/** Um profissional e os ids dos serviços vinculados a ele. */
export interface ProfissionalDoCardapio {
  id: number;
  nome: string;
  servicos: { id: number }[];
}

/**
 * O cardápio com os nomes já cruzados.
 *
 * O agente recebia só ids: o profissional vinha com `servicos: [{id: 20}]` e
 * tinha que casar isso com a lista de serviços de cabeça. Numa conversa real
 * ele não casou — respondeu "dá sim" a um corte de cabelo com quem só faz
 * barba. O cliente escolheria o horário e só então levaria a recusa da API.
 *
 * Prompt não conserta isso de forma confiável; dado bem posto, sim.
 *
 * Profissional sem vínculo nenhum atende TUDO — é como
 * `validarServicosDoAgendamento` lê a lista vazia, e o cardápio tem que
 * contar a mesma história que a validação, senão o robô nega o que a API
 * aceitaria.
 */
export function montarCardapio(
  servicos: ServicoDoCardapio[],
  profissionais: ProfissionalDoCardapio[],
) {
  const equipe = profissionais.map((profissional) => {
    const vinculados = profissional.servicos.map((s) => s.id);
    const atende = vinculados.length
      ? servicos.filter((s) => vinculados.includes(s.id))
      : servicos;
    return {
      id: profissional.id,
      nome: profissional.nome,
      atende: atende.map((s) => ({ id: s.id, nome: s.nome })),
    };
  });

  return {
    servicos: servicos.map((servico) => ({
      ...servico,
      feitoPor: equipe
        .filter((p) => p.atende.some((s) => s.id === servico.id))
        .map((p) => p.nome),
    })),
    profissionais: equipe,
  };
}
