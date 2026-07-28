import {
  documentoValido,
  formatarDocumento,
  limparDocumento,
  tipoDoDocumento,
  validarCNPJ,
  validarCPF,
} from './documento';

describe('validarCPF', () => {
  it('aceita CPFs válidos, com e sem pontuação', () => {
    for (const cpf of ['529.982.247-25', '52998224725', '111.444.777-35']) {
      expect(validarCPF(cpf)).toBe(true);
    }
  });

  it('recusa CPF com dígito verificador errado', () => {
    expect(validarCPF('529.982.247-26')).toBe(false);
    expect(validarCPF('111.444.777-30')).toBe(false);
  });

  it('recusa a sequência de dígitos repetidos', () => {
    // Passam na conta dos verificadores, mas não são CPFs reais — e são
    // justamente o que se digita para burlar cadastro.
    for (const cpf of ['11111111111', '00000000000', '99999999999']) {
      expect(validarCPF(cpf)).toBe(false);
    }
  });

  it('recusa tamanho errado e lixo', () => {
    for (const v of ['', '123', '5299822472', '529982247250', 'abcdefghijk']) {
      expect(validarCPF(v)).toBe(false);
    }
  });
});

describe('validarCNPJ', () => {
  it('aceita CNPJs numéricos válidos', () => {
    for (const cnpj of ['11.222.333/0001-81', '11222333000181']) {
      expect(validarCNPJ(cnpj)).toBe(true);
    }
  });

  it('recusa CNPJ com dígito verificador errado', () => {
    expect(validarCNPJ('11.222.333/0001-82')).toBe(false);
  });

  it('recusa dígitos repetidos e tamanho errado', () => {
    expect(validarCNPJ('11111111111111')).toBe(false);
    expect(validarCNPJ('1122233300018')).toBe(false);
    expect(validarCNPJ('')).toBe(false);
  });

  it('aceita CNPJ alfanumérico (regra que vale desde julho de 2026)', () => {
    // A base é o mesmo CNPJ acima com letras nas posições alfanuméricas; os
    // dois verificadores seguem numéricos e são recalculados pela ASCII-48.
    const base = '12ABC34501DE';
    const calcular = (parcial: string) => {
      let peso = 2;
      let soma = 0;
      for (let i = parcial.length - 1; i >= 0; i--) {
        soma += (parcial.charCodeAt(i) - 48) * peso;
        peso = peso === 9 ? 2 : peso + 1;
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const d1 = calcular(base);
    const d2 = calcular(base + d1);
    expect(validarCNPJ(`${base}${d1}${d2}`)).toBe(true);
    // Trocar um verificador invalida.
    expect(validarCNPJ(`${base}${d1}${(d2 + 1) % 10}`)).toBe(false);
  });
});

describe('tipoDoDocumento', () => {
  it('distingue CPF de CNPJ pelo tamanho e valida', () => {
    expect(tipoDoDocumento('529.982.247-25')).toBe('cpf');
    expect(tipoDoDocumento('11.222.333/0001-81')).toBe('cnpj');
  });

  it('devolve null para documento inválido', () => {
    expect(tipoDoDocumento('529.982.247-26')).toBeNull();
    expect(tipoDoDocumento('11111111111')).toBeNull();
    expect(tipoDoDocumento('123')).toBeNull();
    expect(tipoDoDocumento('')).toBeNull();
  });
});

describe('limparDocumento e formatarDocumento', () => {
  it('tira pontuação e sobe para maiúscula', () => {
    expect(limparDocumento(' 529.982.247-25 ')).toBe('52998224725');
    expect(limparDocumento('12abc34501de35')).toBe('12ABC34501DE35');
  });

  it('formata CPF e CNPJ para leitura', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('devolve o valor limpo quando o tamanho não bate', () => {
    expect(formatarDocumento('123')).toBe('123');
  });
});

describe('documentoValido', () => {
  it('é o atalho de tipoDoDocumento', () => {
    expect(documentoValido('529.982.247-25')).toBe(true);
    expect(documentoValido('11.222.333/0001-81')).toBe(true);
    expect(documentoValido('11111111111')).toBe(false);
  });
});
