import {
  crc16,
  gerarPixCopiaECola,
  pixValido,
  validarChavePix,
} from './pix-brcode';

describe('crc16 (CCITT-FALSE)', () => {
  it('calcula o CRC de referência do padrão', () => {
    // Vetor clássico: CRC16/CCITT-FALSE de "123456789" é 29B1.
    expect(crc16('123456789')).toBe('29B1');
  });

  it('sempre devolve 4 caracteres hexadecimais', () => {
    for (const t of ['a', 'pix', 'BARBEARIA', '000201']) {
      expect(crc16(t)).toMatch(/^[0-9A-F]{4}$/);
    }
  });
});

describe('gerarPixCopiaECola', () => {
  const base = {
    chave: 'contato@barbeariadomarcao.app',
    nome: 'Barbearia do Marcao',
    cidade: 'Sao Paulo',
  };

  it('gera um payload com CRC válido', () => {
    const payload = gerarPixCopiaECola({ ...base, valor: 99.9 });
    expect(pixValido(payload)).toBe(true);
  });

  it('começa com o Payload Format Indicator e termina com o CRC', () => {
    const payload = gerarPixCopiaECola({ ...base, valor: 10 });
    expect(payload.startsWith('000201')).toBe(true);
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('inclui o GUI do Pix e a chave', () => {
    const payload = gerarPixCopiaECola(base);
    expect(payload).toContain('br.gov.bcb.pix');
    expect(payload).toContain(base.chave);
  });

  it('inclui o valor formatado com 2 casas', () => {
    expect(gerarPixCopiaECola({ ...base, valor: 99.9 })).toContain('54059' + '9.90');
    expect(gerarPixCopiaECola({ ...base, valor: 7 })).toContain('54047.00');
  });

  it('omite o valor quando não informado (Pix de valor livre)', () => {
    const payload = gerarPixCopiaECola(base);
    expect(payload).not.toMatch(/5[0-9]{3}\d+\.\d{2}/);
    expect(pixValido(payload)).toBe(true);
  });

  it('remove acentos do nome e da cidade', () => {
    const payload = gerarPixCopiaECola({
      chave: '11999999999',
      nome: 'Barbearia do Marcão',
      cidade: 'São Paulo',
    });
    expect(payload).toContain('BARBEARIA DO MARCAO');
    expect(payload).toContain('SAO PAULO');
    expect(payload).not.toMatch(/[ÃÇÕÁÉ]/);
  });

  it('corta nome com mais de 25 caracteres', () => {
    const payload = gerarPixCopiaECola({
      ...base,
      nome: 'Barbearia com um nome muito muito longo demais',
    });
    // campo 59 seguido do tamanho — nunca acima de 25
    const m = payload.match(/59(\d{2})/);
    expect(Number(m![1])).toBeLessThanOrEqual(25);
    expect(pixValido(payload)).toBe(true);
  });

  it('usa *** como txid quando não informado', () => {
    expect(gerarPixCopiaECola(base)).toContain('62070503***');
  });

  it('limpa o txid informado', () => {
    const payload = gerarPixCopiaECola({ ...base, txid: 'CLUBE-12/34' });
    expect(payload).toContain('CLUBE1234');
  });

  it('recusa chave vazia', () => {
    expect(() => gerarPixCopiaECola({ ...base, chave: '' })).toThrow(/chave/i);
  });

  it('payload adulterado é detectado pelo CRC', () => {
    const payload = gerarPixCopiaECola({ ...base, valor: 50 });
    expect(payload).toContain('50.00');
    // Alguém tenta mudar o valor de R$ 50,00 para R$ 10,00 sem recalcular o CRC.
    const adulterado = payload.replace('50.00', '10.00');
    expect(adulterado).not.toBe(payload);
    expect(pixValido(adulterado)).toBe(false);
  });
});

describe('validarChavePix', () => {
  it('aceita CPF, CNPJ, e-mail, telefone e chave aleatória', () => {
    expect(validarChavePix('11122233344')).toBe(true);
    expect(validarChavePix('12.345.678/0001-90')).toBe(true);
    expect(validarChavePix('contato@barbearia.app')).toBe(true);
    expect(validarChavePix('+5511999999999')).toBe(true);
    expect(validarChavePix('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('recusa vazio e formatos inválidos', () => {
    expect(validarChavePix('')).toBe(false);
    expect(validarChavePix('   ')).toBe(false);
    expect(validarChavePix('chave-qualquer')).toBe(false);
    expect(validarChavePix('123')).toBe(false);
  });
});
