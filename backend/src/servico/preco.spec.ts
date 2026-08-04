import {
  centavos,
  totalDoAtendimento,
  valorCobrado,
  valorDoServicoNoAgendamento,
} from './preco';

const corte = { id: 1, preco: 40 };
const barba = { id: 2, preco: 25 };

describe('total do atendimento', () => {
  it('soma os preços da barbearia', () => {
    expect(totalDoAtendimento([corte, barba]).total).toBe(65);
  });

  it('devolve o preço de cada serviço para congelar no agendamento', () => {
    expect(totalDoAtendimento([corte, barba]).porServico).toEqual({ '1': 40, '2': 25 });
  });

  it('não acumula lixo de ponto flutuante', () => {
    const { total } = totalDoAtendimento([
      { id: 1, preco: 0.1 },
      { id: 2, preco: 0.2 },
    ]);
    expect(total).toBe(0.3);
  });

  it('sem serviço, total zero', () => {
    expect(totalDoAtendimento([]).total).toBe(0);
  });
});

describe('valor congelado do agendamento', () => {
  // O bug que isto trava: o relatório de junho mudava quando o dono
  // reajustava o preço em agosto, porque a receita era recalculada.
  it('usa o valor congelado, mesmo que o preço do serviço tenha mudado', () => {
    expect(valorCobrado({ valorTotal: 40, servicos: [{ preco: 90 }] })).toBe(40);
  });

  it('agendamento antigo, sem valor congelado, cai no preço atual', () => {
    expect(valorCobrado({ valorTotal: null, servicos: [{ preco: 40 }, { preco: 25 }] })).toBe(65);
  });

  it('valor congelado zero continua sendo zero, não "sem valor"', () => {
    expect(valorCobrado({ valorTotal: 0, servicos: [{ preco: 90 }] })).toBe(0);
  });

  it('serviço a serviço também sai congelado', () => {
    const ag = { precosServicos: { '1': 60 } };
    expect(valorDoServicoNoAgendamento(ag, corte)).toBe(60);
    expect(valorDoServicoNoAgendamento(ag, barba)).toBe(25); // não congelado, usa o de hoje
  });

  it('mapa ausente ou inválido não quebra o relatório', () => {
    expect(valorDoServicoNoAgendamento({}, corte)).toBe(40);
    expect(valorDoServicoNoAgendamento({ precosServicos: 'nada' }, corte)).toBe(40);
  });
});

describe('centavos', () => {
  it('arredonda para duas casas', () => {
    expect(centavos(10.005)).toBe(10.01);
    expect(centavos(0.1 + 0.2)).toBe(0.3);
  });
});
