import {
  estaVigente,
  impedeNovaAssinatura,
  situacaoDaAssinatura,
} from './vigencia';

const AGORA = new Date('2026-08-04T12:00:00Z');
const dias = (n: number) => new Date(AGORA.getTime() + n * 86400_000);
const horas = (n: number) => new Date(AGORA.getTime() + n * 3600_000);

describe('situação da assinatura do clube', () => {
  it('paga e dentro do prazo está ativa', () => {
    expect(situacaoDaAssinatura({ status: 'ativa', fim: dias(10) }, AGORA)).toBe('ativa');
  });

  // O furo principal: não existe job que expire assinatura, então o `status`
  // ficava 'ativa' para sempre — o dono via receita de quem parou de pagar.
  it('paga e vencida está EXPIRADA, mesmo com status "ativa" no banco', () => {
    expect(situacaoDaAssinatura({ status: 'ativa', fim: dias(-1) }, AGORA)).toBe('expirada');
  });

  it('vencendo hoje ainda vale', () => {
    expect(situacaoDaAssinatura({ status: 'ativa', fim: AGORA }, AGORA)).toBe('ativa');
  });

  it('sem data de fim gravada, não dá para dizer que venceu', () => {
    expect(situacaoDaAssinatura({ status: 'ativa', fim: null }, AGORA)).toBe('ativa');
  });

  it('cancelada é cancelada, tenha a data que tiver', () => {
    expect(situacaoDaAssinatura({ status: 'cancelada', fim: dias(10) }, AGORA)).toBe('cancelada');
  });

  it('Pix recém-gerado fica pendente', () => {
    expect(situacaoDaAssinatura({ status: 'pendente', createdAt: horas(-2) }, AGORA)).toBe(
      'pendente',
    );
  });

  // Sem isto, quem gerou o Pix e desistiu ficava travado para sempre no
  // "você já tem uma assinatura aguardando pagamento".
  it('Pix de mais de 24h vira abandono', () => {
    expect(situacaoDaAssinatura({ status: 'pendente', createdAt: horas(-25) }, AGORA)).toBe(
      'abandonada',
    );
  });

  it('aceita data em texto, que é como vem do JSON', () => {
    expect(
      situacaoDaAssinatura({ status: 'ativa', fim: dias(5).toISOString() }, AGORA),
    ).toBe('ativa');
  });

  it('data inválida não derruba o cálculo', () => {
    expect(situacaoDaAssinatura({ status: 'ativa', fim: 'nada disso' }, AGORA)).toBe('ativa');
  });

  it('status desconhecido não vira benefício', () => {
    expect(situacaoDaAssinatura({ status: 'inventado' }, AGORA)).toBe('expirada');
    expect(situacaoDaAssinatura({ status: '' }, AGORA)).toBe('expirada');
  });
});

describe('estaVigente', () => {
  it('só quem está em dia tem direito ao benefício', () => {
    expect(estaVigente({ status: 'ativa', fim: dias(1) }, AGORA)).toBe(true);
    expect(estaVigente({ status: 'ativa', fim: dias(-1) }, AGORA)).toBe(false);
    expect(estaVigente({ status: 'pendente', createdAt: AGORA }, AGORA)).toBe(false);
    expect(estaVigente({ status: 'cancelada' }, AGORA)).toBe(false);
  });
});

describe('impedeNovaAssinatura', () => {
  it('quem já está em dia não contrata de novo', () => {
    expect(impedeNovaAssinatura({ status: 'ativa', fim: dias(5) }, AGORA)).toBe(true);
  });

  it('Pix dentro do prazo também segura', () => {
    expect(impedeNovaAssinatura({ status: 'pendente', createdAt: horas(-1) }, AGORA)).toBe(true);
  });

  // É por aqui que a RENOVAÇÃO passa a existir: antes, quem pagou uma vez
  // ficava 'ativa' para sempre e nunca mais conseguia contratar.
  it('assinatura vencida LIBERA a renovação', () => {
    expect(impedeNovaAssinatura({ status: 'ativa', fim: dias(-1) }, AGORA)).toBe(false);
  });

  it('Pix abandonado libera tentar de novo', () => {
    expect(impedeNovaAssinatura({ status: 'pendente', createdAt: horas(-30) }, AGORA)).toBe(false);
  });

  it('cancelada libera', () => {
    expect(impedeNovaAssinatura({ status: 'cancelada' }, AGORA)).toBe(false);
  });
});
