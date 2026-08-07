import { DIAS_TESTE_GRATIS, testeGratisVigente } from './teste-gratis';

describe('teste grátis', () => {
  const agora = new Date('2026-08-07T12:00:00.000Z');

  it('dura 14 dias', () => {
    expect(DIAS_TESTE_GRATIS).toBe(14);
  });

  it('reconhece qualquer assinatura trialing ainda vigente', () => {
    expect(
      testeGratisVigente(
        { status: 'trialing', dataFim: new Date('2026-08-08T12:00:00.000Z') },
        agora,
      ),
    ).toBe(true);
  });

  it('não libera trial expirado nem assinatura paga como teste', () => {
    expect(
      testeGratisVigente(
        { status: 'trialing', dataFim: new Date('2026-08-07T11:59:59.000Z') },
        agora,
      ),
    ).toBe(false);
    expect(
      testeGratisVigente(
        { status: 'active', dataFim: new Date('2026-09-07T12:00:00.000Z') },
        agora,
      ),
    ).toBe(false);
  });
});
