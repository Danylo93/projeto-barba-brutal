import {
  DIAS_DE_ARREPENDIMENTO,
  dentroDoArrependimento,
  resultadoDoCancelamento,
} from './politica-de-cancelamento';

/** Contratou hoje, plano anual: o período pago vai até daqui a 365 dias. */
function anual(diasAtras: number) {
  const inicio = new Date(Date.now() - diasAtras * 86400000);
  const fim = new Date(inicio.getTime() + 365 * 86400000);
  return { dataInicio: inicio, dataFim: fim, status: 'active', meioPagamento: 'recorrente' };
}

function mensal(diasAtras: number) {
  const inicio = new Date(Date.now() - diasAtras * 86400000);
  const fim = new Date(inicio.getTime() + 30 * 86400000);
  return { dataInicio: inicio, dataFim: fim, status: 'active', meioPagamento: 'pix_avulso' };
}

describe('os sete dias de arrependimento', () => {
  it('valem no dia da compra', () => {
    expect(dentroDoArrependimento(new Date())).toBe(true);
  });

  it('valem no sétimo dia', () => {
    const seteDias = new Date(Date.now() - DIAS_DE_ARREPENDIMENTO * 86400000 + 60_000);
    expect(dentroDoArrependimento(seteDias)).toBe(true);
  });

  it('acabam no oitavo', () => {
    const oitoDias = new Date(Date.now() - (DIAS_DE_ARREPENDIMENTO + 1) * 86400000);
    expect(dentroDoArrependimento(oitoDias)).toBe(false);
  });

  it('data inválida não vira arrependimento eterno', () => {
    expect(dentroDoArrependimento('não é data')).toBe(false);
  });
});

describe('cancelar o anual dentro dos 7 dias', () => {
  it('devolve o ano inteiro e encerra na hora', () => {
    const r = resultadoDoCancelamento(anual(2), 999);
    expect(r.motivo).toBe('arrependimento');
    expect(r.reembolso).toBe(999);
    expect(r.novoStatus).toBe('canceled');
  });

  it('devolve o que foi PAGO, não o preço de hoje', () => {
    // Contratou antes do reajuste. Devolver o preço novo seria devolver
    // dinheiro que nunca entrou.
    expect(resultadoDoCancelamento(anual(1), 799).reembolso).toBe(799);
  });
});

describe('cancelar o anual depois dos 7 dias', () => {
  const r = resultadoDoCancelamento(anual(30), 999);

  it('não devolve dinheiro', () => {
    expect(r.reembolso).toBe(0);
  });

  it('mas o acesso vai até o fim do ano pago', () => {
    // Este é o ponto da regra inteira. Antes, cancelar no dia 30 tirava o
    // acesso na hora: onze meses pagos e não usados, sem reembolso.
    expect(r.novoStatus).toBe('active');
    expect(r.acessoAte.getTime()).toBeGreaterThan(Date.now() + 300 * 86400000);
  });

  it('e a explicação diz a data, não "entre em contato"', () => {
    expect(r.explicacao).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(r.explicacao).toMatch(/sem multa/i);
  });
});

describe('o mensal segue a mesma regra', () => {
  it('dentro de 7 dias, devolve', () => {
    expect(resultadoDoCancelamento(mensal(3), 69.9).reembolso).toBe(69.9);
  });

  it('depois, vale até o fim do mês pago', () => {
    const r = resultadoDoCancelamento(mensal(20), 69.9);
    expect(r.reembolso).toBe(0);
    expect(r.novoStatus).toBe('active');
    expect(r.acessoAte.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('teste grátis', () => {
  it('não devolve nada, e não chama isso de arrependimento', () => {
    // Sem cobrança não há o que estornar, e rotular de arrependimento faria o
    // suporte procurar um pagamento que não existe.
    const r = resultadoDoCancelamento(
      { ...anual(1), status: 'trialing' },
      0,
    );
    expect(r.motivo).toBe('teste_gratis');
    expect(r.reembolso).toBe(0);
    expect(r.novoStatus).toBe('canceled');
  });
});

describe('valor pago ausente não inventa reembolso', () => {
  it.each([0, Number.NaN, -10])('valorPago %p não gera devolução', (valor) => {
    const r = resultadoDoCancelamento(anual(1), valor as number);
    expect(r.reembolso).toBe(0);
    expect(r.motivo).toBe('ate_o_fim_do_periodo');
  });
});
