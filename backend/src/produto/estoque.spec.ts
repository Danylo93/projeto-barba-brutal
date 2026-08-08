import {
  aplicarMovimento,
  estoqueBaixo,
  lucroDaVenda,
  semEstoque,
  tipoValido,
  valorDoEstoque,
} from './estoque';

describe('aplicarMovimento', () => {
  it('entrada soma', () => {
    expect(aplicarMovimento(3, 'entrada', 12)).toEqual({ saldoDepois: 15, variacao: 12 });
  });

  it('venda e saída subtraem', () => {
    expect(aplicarMovimento(15, 'venda', 1)).toEqual({ saldoDepois: 14, variacao: -1 });
    expect(aplicarMovimento(15, 'saida', 2)).toEqual({ saldoDepois: 13, variacao: -2 });
  });

  it('ajuste define o saldo, não soma a ele', () => {
    // É o movimento da contagem de prateleira: "conferi, tem 7".
    expect(aplicarMovimento(15, 'ajuste', 7)).toEqual({ saldoDepois: 7, variacao: -8 });
    expect(aplicarMovimento(2, 'ajuste', 9)).toEqual({ saldoDepois: 9, variacao: 7 });
  });

  it('ajuste para zero é legítimo', () => {
    // "Acabou" é uma contagem tão válida quanto qualquer outra.
    expect(aplicarMovimento(4, 'ajuste', 0)).toEqual({ saldoDepois: 0, variacao: -4 });
  });

  it('não vende o que não tem', () => {
    // Sem isto o saldo fica negativo e o relatório de estoque vira ficção.
    expect(() => aplicarMovimento(2, 'venda', 3)).toThrow(/estoque de 2/);
    expect(() => aplicarMovimento(0, 'venda', 1)).toThrow();
  });

  it('vender exatamente o último é permitido', () => {
    expect(aplicarMovimento(1, 'venda', 1)).toEqual({ saldoDepois: 0, variacao: -1 });
  });

  it('recusa quantidade zero, negativa ou quebrada', () => {
    expect(() => aplicarMovimento(5, 'entrada', 0)).toThrow();
    expect(() => aplicarMovimento(5, 'entrada', -2)).toThrow();
    expect(() => aplicarMovimento(5, 'entrada', 1.5)).toThrow(/inteiro/);
    expect(() => aplicarMovimento(5, 'ajuste', -1)).toThrow(/negativo/);
  });
});

describe('tipoValido', () => {
  it('aceita só os quatro tipos', () => {
    expect(tipoValido('entrada')).toBe(true);
    expect(tipoValido('ajuste')).toBe(true);
    expect(tipoValido('sumiu')).toBe(false);
    expect(tipoValido(null)).toBe(false);
  });
});

describe('alerta de estoque', () => {
  it('avisa quando chega no mínimo', () => {
    expect(estoqueBaixo({ estoque: 2, estoqueMinimo: 2 })).toBe(true);
    expect(estoqueBaixo({ estoque: 1, estoqueMinimo: 2 })).toBe(true);
    expect(estoqueBaixo({ estoque: 3, estoqueMinimo: 2 })).toBe(false);
  });

  it('mínimo zero significa "não me avise"', () => {
    // Senão todo produto novo nasceria gritando, e o alerta perderia o valor.
    expect(estoqueBaixo({ estoque: 0, estoqueMinimo: 0 })).toBe(false);
  });

  it('sem estoque é outra coisa de estoque baixo', () => {
    expect(semEstoque({ estoque: 0 })).toBe(true);
    expect(semEstoque({ estoque: 1 })).toBe(false);
  });
});

describe('dinheiro', () => {
  it('o lucro é a margem, não o faturamento', () => {
    expect(lucroDaVenda(40, 32, 1)).toBe(8);
    expect(lucroDaVenda(40, 32, 3)).toBe(24);
  });

  it('vender no prejuízo aparece como prejuízo', () => {
    // Se isto virasse zero, o dono não descobriria que está pagando para
    // vender.
    expect(lucroDaVenda(30, 32, 2)).toBe(-4);
  });

  it('o valor parado na prateleira sai pelo custo', () => {
    expect(
      valorDoEstoque([
        { estoque: 10, precoCusto: 32 },
        { estoque: 3, precoCusto: 15.5 },
      ]),
    ).toBe(366.5);
  });

  it('saldo negativo herdado não infla o inventário', () => {
    expect(valorDoEstoque([{ estoque: -5, precoCusto: 32 }])).toBe(0);
  });
});
