import {
  centavos,
  precoDoServico,
  precosDaVitrine,
  tabelaDePrecos,
  totalDoAtendimento,
  validarPrecoInformado,
  valorCobrado,
  valorDoServicoNoAgendamento,
} from './preco';

const corte = { id: 1, preco: 40 };
const barba = { id: 2, preco: 25 };

describe('tabela de preços do profissional', () => {
  it('sem personalização, vale o preço da barbearia', () => {
    const tabela = tabelaDePrecos([corte, barba]);
    expect(tabela.get(1)).toBe(40);
    expect(tabela.get(2)).toBe(25);
  });

  it('o preço do profissional substitui o da barbearia', () => {
    const tabela = tabelaDePrecos([corte, barba], [{ servicoId: 1, preco: 60 }]);
    expect(tabela.get(1)).toBe(60);
    expect(tabela.get(2)).toBe(25); // este ele não personalizou
  });

  // O dono reajusta o corte e quem não personalizou sobe junto — é o motivo
  // de guardar só a exceção em vez de copiar o preço para todo mundo.
  it('quem não personalizou acompanha o reajuste da barbearia', () => {
    const reajustado = { id: 1, preco: 50 };
    expect(precoDoServico(reajustado, [])).toBe(50);
    expect(precoDoServico(reajustado, [{ servicoId: 1, preco: 60 }])).toBe(60);
  });

  it('ignora personalização de serviço que o profissional não realiza', () => {
    const tabela = tabelaDePrecos([corte], [{ servicoId: 99, preco: 999 }]);
    expect(tabela.has(99)).toBe(false);
    expect(tabela.get(1)).toBe(40);
  });

  it('ignora preço quebrado sem derrubar o resto', () => {
    const tabela = tabelaDePrecos([corte], [{ servicoId: 1, preco: NaN }]);
    expect(tabela.get(1)).toBe(40);
  });

  it('preço zero é personalização válida (cortesia), não ausência', () => {
    expect(precoDoServico(corte, [{ servicoId: 1, preco: 0 }])).toBe(0);
  });
});

describe('total do atendimento', () => {
  it('soma os preços do profissional, não os da barbearia', () => {
    const { total } = totalDoAtendimento([corte, barba], [{ servicoId: 1, preco: 60 }]);
    expect(total).toBe(85);
  });

  it('devolve o preço de cada serviço para congelar no agendamento', () => {
    const { porServico } = totalDoAtendimento([corte, barba], [{ servicoId: 2, preco: 30 }]);
    expect(porServico).toEqual({ '1': 40, '2': 30 });
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

describe('validação do preço informado', () => {
  it('campo vazio limpa a personalização', () => {
    expect(validarPrecoInformado('')).toBeNull();
    expect(validarPrecoInformado(null)).toBeNull();
    expect(validarPrecoInformado(undefined)).toBeNull();
  });

  it('aceita vírgula, que é como se digita preço no Brasil', () => {
    expect(validarPrecoInformado('45,90')).toBe(45.9);
  });

  it('arredonda para centavos', () => {
    expect(validarPrecoInformado(45.999)).toBe(46);
  });

  it('recusa texto', () => {
    expect(() => validarPrecoInformado('dez')).toThrow(/números/i);
  });

  it('recusa negativo', () => {
    expect(() => validarPrecoInformado(-1)).toThrow(/negativo/i);
  });

  it('recusa valor absurdo', () => {
    expect(() => validarPrecoInformado(100001)).toThrow(/limite/i);
  });

  it('aceita zero', () => {
    expect(validarPrecoInformado(0)).toBe(0);
  });

  // `Number(true)` é 1: sem a checagem de tipo, `preco: false` respondia 200 e
  // deixava o serviço a R$ 0,00.
  it('recusa booleano em vez de virar 1 ou 0', () => {
    expect(() => validarPrecoInformado(true)).toThrow(/números/i);
    expect(() => validarPrecoInformado(false)).toThrow(/números/i);
  });

  it('recusa objeto e lista', () => {
    expect(() => validarPrecoInformado({})).toThrow(/números/i);
    expect(() => validarPrecoInformado([50])).toThrow(/números/i);
  });
});

describe('preço na vitrine pública', () => {
  it('sem profissional vinculado, mostra o preço da barbearia', () => {
    const [linha] = precosDaVitrine([corte], []);
    expect(linha.precoMinimo).toBe(40);
    expect(linha.precoVariavel).toBe(false);
  });

  it('todos cobrando igual: preço fechado', () => {
    const equipe = [
      { servicos: [{ id: 1 }], precos: [] },
      { servicos: [{ id: 1 }], precos: [] },
    ];
    const [linha] = precosDaVitrine([corte], equipe);
    expect(linha.precoMinimo).toBe(40);
    expect(linha.precoVariavel).toBe(false);
  });

  it('preços diferentes viram "a partir de" com o menor', () => {
    const equipe = [
      { servicos: [{ id: 1 }], precos: [] }, // 40
      { servicos: [{ id: 1 }], precos: [{ servicoId: 1, preco: 70 }] },
    ];
    const [linha] = precosDaVitrine([corte], equipe);
    expect(linha.precoMinimo).toBe(40);
    expect(linha.precoMaximo).toBe(70);
    expect(linha.precoVariavel).toBe(true);
  });

  // Anunciar 40 quando o único barbeiro cobra 70 seria propaganda enganosa.
  it('não anuncia preço de tabela que ninguém pratica', () => {
    const equipe = [{ servicos: [{ id: 1 }], precos: [{ servicoId: 1, preco: 70 }] }];
    const [linha] = precosDaVitrine([corte], equipe);
    expect(linha.precoMinimo).toBe(70);
    expect(linha.precoVariavel).toBe(false);
  });

  it('só considera quem realiza o serviço', () => {
    const equipe = [
      { servicos: [{ id: 2 }], precos: [{ servicoId: 2, preco: 5 }] }, // só barba
      { servicos: [{ id: 1 }], precos: [] },
    ];
    const [linha] = precosDaVitrine([corte], equipe);
    expect(linha.precoMinimo).toBe(40);
  });

  it('preserva os campos do serviço', () => {
    const [linha] = precosDaVitrine([{ ...corte, nome: 'Corte' }], []);
    expect(linha.nome).toBe('Corte');
    expect(linha.preco).toBe(40);
  });
});

describe('valor congelado do agendamento', () => {
  // O bug que isto trava: relatório de junho mudava quando o preço subia
  // em agosto, porque a receita era recalculada pelo preço de hoje.
  it('usa o valor congelado, mesmo que o preço do serviço tenha mudado', () => {
    const agendamento = { valorTotal: 40, servicos: [{ preco: 90 }] };
    expect(valorCobrado(agendamento)).toBe(40);
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
