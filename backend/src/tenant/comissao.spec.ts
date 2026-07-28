import { calcularComissoes, intervaloDoMes } from './comissao';

describe('calcularComissoes', () => {
  const marcao = { id: 1, nome: 'Marcão', comissaoPercent: 50 };
  const carlos = { id: 2, nome: 'Carlos', comissaoPercent: 40 };

  it('calcula comissão e líquido por profissional', () => {
    const r = calcularComissoes(
      [marcao],
      [
        { profissionalId: 1, status: 'concluido', servicos: [{ preco: 25 }] },
        { profissionalId: 1, status: 'agendado', servicos: [{ preco: 40 }] },
      ],
    );
    const linha = r.linhas[0];
    expect(linha.atendimentos).toBe(2);
    expect(linha.faturamento).toBe(65);
    expect(linha.comissao).toBe(32.5); // 50%
    expect(linha.liquidoBarbearia).toBe(32.5);
  });

  it('ignora atendimentos cancelados', () => {
    const r = calcularComissoes(
      [marcao],
      [
        { profissionalId: 1, status: 'cancelado', servicos: [{ preco: 100 }] },
        { profissionalId: 1, status: 'concluido', servicos: [{ preco: 20 }] },
      ],
    );
    expect(r.linhas[0].atendimentos).toBe(1);
    expect(r.linhas[0].faturamento).toBe(20);
  });

  it('soma vários serviços no mesmo atendimento', () => {
    const r = calcularComissoes(
      [marcao],
      [{ profissionalId: 1, status: 'agendado', servicos: [{ preco: 25 }, { preco: 20 }] }],
    );
    expect(r.linhas[0].faturamento).toBe(45);
    expect(r.linhas[0].comissao).toBe(22.5);
  });

  it('separa por profissional e totaliza', () => {
    const r = calcularComissoes(
      [marcao, carlos],
      [
        { profissionalId: 1, status: 'agendado', servicos: [{ preco: 100 }] },
        { profissionalId: 2, status: 'agendado', servicos: [{ preco: 50 }] },
      ],
    );
    expect(r.totalFaturamento).toBe(150);
    expect(r.totalComissao).toBe(70); // 50 + 20
    expect(r.totalLiquido).toBe(80);
    // ordenado pelo maior faturamento
    expect(r.linhas[0].profissional).toBe('Marcão');
  });

  it('profissional sem comissão configurada fica com 0', () => {
    const r = calcularComissoes(
      [{ id: 3, nome: 'Novato' }],
      [{ profissionalId: 3, status: 'agendado', servicos: [{ preco: 80 }] }],
    );
    expect(r.linhas[0].comissao).toBe(0);
    expect(r.linhas[0].liquidoBarbearia).toBe(80);
  });

  it('lista profissional sem atendimentos com valores zerados', () => {
    const r = calcularComissoes([marcao], []);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].atendimentos).toBe(0);
    expect(r.totalComissao).toBe(0);
  });

  it('ignora atendimento de profissional fora da lista', () => {
    const r = calcularComissoes(
      [marcao],
      [{ profissionalId: 99, status: 'agendado', servicos: [{ preco: 50 }] }],
    );
    expect(r.totalFaturamento).toBe(0);
  });

  it('limita percentual fora da faixa 0-100', () => {
    const r = calcularComissoes(
      [{ id: 1, nome: 'X', comissaoPercent: 150 }],
      [{ profissionalId: 1, status: 'agendado', servicos: [{ preco: 10 }] }],
    );
    expect(r.linhas[0].comissaoPercent).toBe(100);
    expect(r.linhas[0].comissao).toBe(10);
  });

  it('arredonda centavos corretamente', () => {
    const r = calcularComissoes(
      [{ id: 1, nome: 'X', comissaoPercent: 33 }],
      [{ profissionalId: 1, status: 'agendado', servicos: [{ preco: 25.9 }] }],
    );
    expect(r.linhas[0].comissao).toBe(8.55); // 25.90 * 0.33 = 8.547
  });
});

describe('intervaloDoMes', () => {
  it('monta o intervalo do mês informado', () => {
    const { inicio, fim, ref } = intervaloDoMes('2026-07');
    expect(ref).toBe('2026-07');
    expect(inicio.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('vira o ano em dezembro', () => {
    const { fim } = intervaloDoMes('2026-12');
    expect(fim.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('cai no mês atual quando o parâmetro é inválido', () => {
    const agora = new Date();
    const esperado = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    expect(intervaloDoMes('mês errado').ref).toBe(esperado);
    expect(intervaloDoMes('2026-13').ref).toBe(esperado);
    expect(intervaloDoMes().ref).toBe(esperado);
  });
});
