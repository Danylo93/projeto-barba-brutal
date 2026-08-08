import {
  aguardandoPagamento,
  avisoDoSinal,
  calcularSinal,
  horarioEstaSegurado,
  prazoParaPagar,
  sinalExpirou,
  SINAL_EXPIRADO,
  SINAL_NAO_EXIGIDO,
  SINAL_PAGO,
  SINAL_PENDENTE,
  statusInicial,
} from './sinal';
import { gerarPixCopiaECola, pixValido } from './pix-brcode';

const BARBEARIA = {
  sinalAtivo: true,
  sinalPercent: 30,
  sinalMinimo: 10,
  sinalPrazoMinutos: 30,
  chavePix: 'contato@barbeariadomarcao.app',
};

describe('quanto de sinal', () => {
  it('é o percentual do valor do serviço', () => {
    expect(calcularSinal(BARBEARIA, 100)).toBe(30);
  });

  it('respeita o piso quando o percentual dá pouco', () => {
    // 30% de R$ 25 é R$ 7,50. Pix de R$ 7,50 não segura horário nenhum.
    expect(calcularSinal(BARBEARIA, 25)).toBe(10);
  });

  it('nunca cobra mais que o próprio serviço', () => {
    // Piso de R$ 10 num serviço de R$ 8 viraria cobrar adiantado mais do que
    // o atendimento inteiro custa.
    expect(calcularSinal(BARBEARIA, 8)).toBe(8);
  });

  it('desligado, não cobra nada', () => {
    expect(calcularSinal({ ...BARBEARIA, sinalAtivo: false }, 100)).toBe(0);
  });

  it('sem chave Pix cadastrada, não cobra nada', () => {
    // Pedir dinheiro sem dizer para onde mandar travaria o agendamento sem
    // cobrar de ninguém. Quem tem que resolver é o dono.
    expect(calcularSinal({ ...BARBEARIA, chavePix: null }, 100)).toBe(0);
    expect(calcularSinal({ ...BARBEARIA, chavePix: '   ' }, 100)).toBe(0);
  });

  it('regra ligada mas zerada não cobra nada', () => {
    expect(calcularSinal({ ...BARBEARIA, sinalPercent: 0, sinalMinimo: 0 }, 100)).toBe(0);
  });

  it('serviço sem preço não gera sinal', () => {
    expect(calcularSinal(BARBEARIA, 0)).toBe(0);
    expect(calcularSinal(BARBEARIA, NaN as any)).toBe(0);
  });

  it('arredonda para centavo', () => {
    expect(calcularSinal({ ...BARBEARIA, sinalPercent: 33, sinalMinimo: 0 }, 49.9)).toBe(16.47);
  });
});

describe('estado do agendamento', () => {
  it('com sinal nasce pendente; sem sinal, nasce resolvido', () => {
    expect(statusInicial(30)).toBe(SINAL_PENDENTE);
    expect(statusInicial(0)).toBe(SINAL_NAO_EXIGIDO);
  });

  it('o prazo padrão é meia hora', () => {
    const agora = new Date('2026-08-08T12:00:00Z');
    expect(prazoParaPagar(BARBEARIA, agora).toISOString()).toBe('2026-08-08T12:30:00.000Z');
  });

  it('prazo bobo cai no padrão em vez de expirar na hora', () => {
    const agora = new Date('2026-08-08T12:00:00Z');
    expect(prazoParaPagar({ sinalPrazoMinutos: 0 }, agora).toISOString()).toBe('2026-08-08T12:30:00.000Z');
    expect(prazoParaPagar({ sinalPrazoMinutos: -5 }, agora).toISOString()).toBe('2026-08-08T12:30:00.000Z');
  });
});

describe('expiração', () => {
  const agora = new Date('2026-08-08T12:00:00Z');

  it('expira quando o prazo passa sem pagamento', () => {
    expect(
      sinalExpirou({ sinalStatus: SINAL_PENDENTE, sinalExpiraEm: '2026-08-08T11:59:00Z' }, agora),
    ).toBe(true);
  });

  it('dentro do prazo, o horário continua do cliente', () => {
    // Este é o ponto: pendente NÃO libera a agenda. O prazo é dele.
    const dentro = { sinalStatus: SINAL_PENDENTE, sinalExpiraEm: '2026-08-08T12:15:00Z' };
    expect(sinalExpirou(dentro, agora)).toBe(false);
    expect(horarioEstaSegurado(dentro, agora)).toBe(true);
  });

  it('quem já pagou não expira nunca', () => {
    expect(
      sinalExpirou({ sinalStatus: SINAL_PAGO, sinalExpiraEm: '2026-01-01T00:00:00Z' }, agora),
    ).toBe(false);
    expect(
      horarioEstaSegurado({ sinalStatus: SINAL_PAGO, sinalExpiraEm: '2026-01-01T00:00:00Z' }, agora),
    ).toBe(true);
  });

  it('quem não devia sinal também não expira', () => {
    expect(sinalExpirou({ sinalStatus: SINAL_NAO_EXIGIDO, sinalExpiraEm: null }, agora)).toBe(false);
  });

  it('expirado libera a agenda', () => {
    expect(horarioEstaSegurado({ sinalStatus: SINAL_EXPIRADO }, agora)).toBe(false);
  });

  it('aguardandoPagamento só é verdade no pendente', () => {
    expect(aguardandoPagamento({ sinalStatus: SINAL_PENDENTE })).toBe(true);
    expect(aguardandoPagamento({ sinalStatus: SINAL_PAGO })).toBe(false);
    expect(aguardandoPagamento({ sinalStatus: null })).toBe(false);
  });
});

describe('o Pix que o cliente copia', () => {
  it('sai com CRC válido e com o valor do sinal dentro', () => {
    const brcode = gerarPixCopiaECola({
      chave: 'contato@barbeariadomarcao.app',
      nome: 'Barbearia do Marcao',
      valor: 15,
      txid: 'BBSINAL36',
      descricao: 'Sinal do agendamento',
    });

    expect(pixValido(brcode)).toBe(true);
    // Campo 54 (valor), com o tamanho declarado: "5405" + "15.00".
    expect(brcode).toContain('540515.00');
  });

  it('o valor muda o código — não é um QR fixo', () => {
    const base = { chave: 'x@y.com', nome: 'BARBEARIA', txid: 'A1' };
    expect(gerarPixCopiaECola({ ...base, valor: 15 })).not.toBe(
      gerarPixCopiaECola({ ...base, valor: 20 }),
    );
  });
});

describe('o que o cliente lê', () => {
  it('diz o valor, para onde vai e por quanto tempo o horário é dele', () => {
    const texto = avisoDoSinal(15, 30);
    expect(texto).toContain('R$ 15,00');
    expect(texto).toMatch(/conta da barbearia/i);
    expect(texto).toContain('30 minutos');
  });
});
