/**
 * Cálculo de comissões dos profissionais — função pura, sem Nest/Prisma,
 * para ficar fácil de testar e de reaproveitar.
 *
 * Regra: cada atendimento gera comissão sobre o valor total dos serviços,
 * no percentual configurado no cadastro do profissional. Atendimentos
 * cancelados não contam.
 */

export interface AtendimentoParaComissao {
  profissionalId: number;
  status?: string | null;
  servicos: { preco: number }[];
}

export interface ProfissionalParaComissao {
  id: number;
  nome: string;
  comissaoPercent?: number | null;
}

export interface LinhaComissao {
  profissionalId: number;
  profissional: string;
  comissaoPercent: number;
  atendimentos: number;
  faturamento: number;
  comissao: number;
  /** Quanto sobra para a barbearia depois da comissão. */
  liquidoBarbearia: number;
}

export interface ResumoComissoes {
  linhas: LinhaComissao[];
  totalFaturamento: number;
  totalComissao: number;
  totalLiquido: number;
}

const STATUS_QUE_NAO_CONTAM = new Set(['cancelado']);

/** Arredonda para 2 casas, evitando o clássico 0.1+0.2 do ponto flutuante. */
function centavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularComissoes(
  profissionais: ProfissionalParaComissao[],
  atendimentos: AtendimentoParaComissao[],
): ResumoComissoes {
  const porProfissional = new Map<number, LinhaComissao>();

  for (const p of profissionais) {
    const percent = Math.min(100, Math.max(0, p.comissaoPercent ?? 0));
    porProfissional.set(p.id, {
      profissionalId: p.id,
      profissional: p.nome,
      comissaoPercent: percent,
      atendimentos: 0,
      faturamento: 0,
      comissao: 0,
      liquidoBarbearia: 0,
    });
  }

  for (const a of atendimentos) {
    if (STATUS_QUE_NAO_CONTAM.has((a.status ?? '').toLowerCase())) continue;
    const linha = porProfissional.get(a.profissionalId);
    if (!linha) continue; // profissional removido do cadastro
    const valor = (a.servicos ?? []).reduce((s, sv) => s + (sv.preco ?? 0), 0);
    linha.atendimentos += 1;
    linha.faturamento += valor;
  }

  const linhas = [...porProfissional.values()].map((l) => {
    const faturamento = centavos(l.faturamento);
    const comissao = centavos((faturamento * l.comissaoPercent) / 100);
    return {
      ...l,
      faturamento,
      comissao,
      liquidoBarbearia: centavos(faturamento - comissao),
    };
  });

  // Quem mais faturou primeiro; empate resolve por nome.
  linhas.sort(
    (a, b) => b.faturamento - a.faturamento || a.profissional.localeCompare(b.profissional),
  );

  return {
    linhas,
    totalFaturamento: centavos(linhas.reduce((s, l) => s + l.faturamento, 0)),
    totalComissao: centavos(linhas.reduce((s, l) => s + l.comissao, 0)),
    totalLiquido: centavos(linhas.reduce((s, l) => s + l.liquidoBarbearia, 0)),
  };
}

/**
 * Intervalo do mês de referência (aceita "2026-07"); sem parâmetro, mês atual.
 * As datas são montadas no fuso local do servidor, que é UTC no deploy.
 */
export function intervaloDoMes(mes?: string): { inicio: Date; fim: Date; ref: string } {
  const agora = new Date();
  let ano = agora.getFullYear();
  let mesIndex = agora.getMonth();

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [a, m] = mes.split('-').map(Number);
    if (m >= 1 && m <= 12) {
      ano = a;
      mesIndex = m - 1;
    }
  }

  const inicio = new Date(Date.UTC(ano, mesIndex, 1, 0, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mesIndex + 1, 1, 0, 0, 0, 0));
  return {
    inicio,
    fim,
    ref: `${ano}-${String(mesIndex + 1).padStart(2, '0')}`,
  };
}
