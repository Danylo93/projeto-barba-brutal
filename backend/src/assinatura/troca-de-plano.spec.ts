import { contaDaTroca, creditoDoCicloAtual, tipoDaTroca } from './troca-de-plano';

const MENSAL = { preco: 99.9, duracao: 30, grupo: 'premium' };
const ANUAL = { preco: 999, duracao: 365, grupo: 'premium' };
const BASICO = { preco: 49.9, duracao: 30, grupo: 'basico' };

const AGORA = new Date('2026-08-08T12:00:00Z');
/** Ciclo mensal com 20 dos 30 dias restantes. */
const CICLO = {
  dataInicio: new Date('2026-07-29T12:00:00Z'),
  dataFim: new Date('2026-08-28T12:00:00Z'),
};

describe('trocar do mensal para o anual', () => {
  it('cobra o ano inteiro, descontando o que sobrou do mês', () => {
    // A fórmula antiga cobrava (999 − 99,90) × 0,667 = R$ 599,40 e entregava
    // 365 dias: R$ 399,60 a menos por barbearia.
    const conta = contaDaTroca(ANUAL, MENSAL, CICLO, false, AGORA);

    expect(conta.precoDoPlano).toBe(999);
    expect(conta.credito).toBe(66.6); // 99,90 × 20/30
    expect(conta.valor).toBe(932.4);
  });

  it('trocar no último dia não vira um ano por trinta reais', () => {
    // Era o pior caso: 899,10 × (1/30) = R$ 29,97 por um ano de Premium.
    const ultimoDia = {
      dataInicio: new Date('2026-07-29T12:00:00Z'),
      dataFim: new Date('2026-08-09T12:00:00Z'),
    };
    const conta = contaDaTroca(ANUAL, MENSAL, ultimoDia, false, AGORA);

    expect(conta.valor).toBeGreaterThan(980);
    expect(conta.valor).toBeLessThanOrEqual(999);
  });

  it('quem acabou de pagar o mês abate quase o mês todo', () => {
    const recemPago = {
      dataInicio: new Date('2026-08-08T00:00:00Z'),
      dataFim: new Date('2026-09-07T00:00:00Z'),
    };
    const conta = contaDaTroca(ANUAL, MENSAL, recemPago, false, AGORA);
    expect(conta.credito).toBeGreaterThan(97);
    expect(conta.valor).toBeLessThan(902);
  });
});

describe('upgrade dentro do mesmo ciclo', () => {
  it('cobra o plano novo menos o que resta do antigo', () => {
    const conta = contaDaTroca(MENSAL, BASICO, CICLO, false, AGORA);
    expect(conta.credito).toBe(33.27); // 49,90 × 20/30
    expect(conta.valor).toBe(66.63);
  });

  it('e o valor nunca passa do preço de tabela', () => {
    const conta = contaDaTroca(MENSAL, BASICO, CICLO, false, AGORA);
    expect(conta.valor).toBeLessThanOrEqual(MENSAL.preco);
  });
});

describe('crédito', () => {
  it('teste grátis não gera crédito — não houve pagamento', () => {
    expect(creditoDoCicloAtual(MENSAL, CICLO, true, AGORA)).toBe(0);
  });

  it('ciclo já vencido não gera crédito', () => {
    const vencido = {
      dataInicio: new Date('2026-06-01T00:00:00Z'),
      dataFim: new Date('2026-07-01T00:00:00Z'),
    };
    expect(creditoDoCicloAtual(MENSAL, vencido, false, AGORA)).toBe(0);
  });

  it('sem assinatura anterior, paga o cheio', () => {
    const conta = contaDaTroca(ANUAL, null, null, false, AGORA);
    expect(conta.credito).toBe(0);
    expect(conta.valor).toBe(999);
  });

  it('crédito nunca passa do preço do plano que se está trocando', () => {
    // Data de fim maior que o ciclo (dado torto) não pode virar crédito
    // maior do que a barbearia pagou.
    const torto = {
      dataInicio: new Date('2026-08-08T00:00:00Z'),
      dataFim: new Date('2027-08-08T00:00:00Z'),
    };
    expect(creditoDoCicloAtual(MENSAL, torto, false, AGORA)).toBeLessThanOrEqual(MENSAL.preco);
  });
});

describe('downgrade', () => {
  it('não devolve dinheiro por um clique', () => {
    // Anual com onze meses restantes trocando para o Básico daria crédito
    // maior que o preço. O desconto para no zero; devolução é conversa com o
    // suporte.
    const cicloAnual = {
      dataInicio: new Date('2026-08-01T00:00:00Z'),
      dataFim: new Date('2027-08-01T00:00:00Z'),
    };
    const conta = contaDaTroca(BASICO, ANUAL, cicloAnual, false, AGORA);
    expect(conta.valor).toBeGreaterThan(0);
    expect(conta.valor).toBeLessThan(1);
  });
});

describe('como a troca se chama na tela', () => {
  it('o mesmo plano em outra periodicidade não sobe nem desce', () => {
    // Pelo preço cheio, R$ 999 contra R$ 99,90 seria "upgrade". Pelo custo
    // por dia, o anual é MAIS BARATO — é esse o desconto — e viraria
    // "downgrade" no botão de quem vai pagar um ano adiantado. Nem um nem
    // outro: é o mesmo plano.
    expect(tipoDaTroca(ANUAL, MENSAL)).toBe('periodicidade');
    expect(tipoDaTroca(MENSAL, ANUAL)).toBe('periodicidade');
  });

  it('entre planos diferentes, o custo por dia é a medida honesta', () => {
    expect(tipoDaTroca(MENSAL, BASICO)).toBe('upgrade');
    expect(tipoDaTroca(BASICO, MENSAL)).toBe('downgrade');
    // Premium anual (R$ 2,74/dia) ainda é subir em relação ao Básico mensal
    // (R$ 1,66/dia), apesar de custar "menos por dia" que o Premium mensal.
    expect(tipoDaTroca(ANUAL, BASICO)).toBe('upgrade');
  });

  it('sem plano atual, é sempre entrada', () => {
    expect(tipoDaTroca(MENSAL, null)).toBe('upgrade');
  });
});
