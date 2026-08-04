import { CATALOGO_PADRAO, paraCriar, servicosQueFaltam } from './catalogo-padrao';

const nomes = (lista: { nome: string }[]) => lista.map((s) => s.nome);

describe('catálogo padrão', () => {
  it('tem uma foto de verdade para cada serviço', () => {
    for (const s of CATALOGO_PADRAO) {
      expect(s.imagemURL).toMatch(/^\/servicos\/[a-z-]+\.jpg$/);
    }
  });

  it('não repete nome', () => {
    expect(new Set(nomes(CATALOGO_PADRAO)).size).toBe(CATALOGO_PADRAO.length);
  });

  it('tem preço e duração válidos', () => {
    for (const s of CATALOGO_PADRAO) {
      expect(s.preco).toBeGreaterThan(0);
      expect(s.qtdeSlots).toBeGreaterThanOrEqual(1);
    }
  });

  it('marca como combo só o que junta serviços', () => {
    const combos = CATALOGO_PADRAO.filter((s) => s.ehCombo).map((s) => s.nome);
    expect(combos).toEqual(['Combo Corte + Barba', 'Dia do Noivo']);
  });
});

describe('serviços que faltam', () => {
  it('barbearia nova recebe o catálogo inteiro', () => {
    expect(servicosQueFaltam([])).toHaveLength(CATALOGO_PADRAO.length);
    expect(servicosQueFaltam(undefined as any)).toHaveLength(CATALOGO_PADRAO.length);
  });

  it('não duplica o que já existe com nome parecido', () => {
    // Exatamente o que a Barbearia do Marcão tem hoje em produção.
    const faltam = servicosQueFaltam([
      { nome: 'Corte de Cabelo' },
      { nome: 'Corte de Barba' },
      { nome: 'Combo Completo' },
    ]);
    expect(nomes(faltam)).toEqual(['Corte Infantil', 'Dia do Noivo', 'Manicure e Pedicure']);
  });

  // "Corte de Barba" contém "corte", mas não é corte de cabelo: se a
  // comparação fosse por substring, a barbearia ficaria sem o serviço
  // principal do catálogo.
  it('quem só tem barba continua ganhando o corte de cabelo', () => {
    const faltam = servicosQueFaltam([{ nome: 'Corte de Barba' }]);
    expect(nomes(faltam)).toContain('Corte de Cabelo');
    expect(nomes(faltam)).not.toContain('Barba');
  });

  it('ignora acento e caixa', () => {
    const faltam = servicosQueFaltam([{ nome: 'MANICURE E PEDICURE' }, { nome: 'Dia do Noivô' }]);
    expect(nomes(faltam)).not.toContain('Manicure e Pedicure');
    expect(nomes(faltam)).not.toContain('Dia do Noivo');
  });

  it('reconhece o combo escrito de outro jeito', () => {
    expect(nomes(servicosQueFaltam([{ nome: 'Corte + Barba' }]))).not.toContain(
      'Combo Corte + Barba',
    );
    expect(nomes(servicosQueFaltam([{ nome: 'Corte e Barba' }]))).not.toContain(
      'Combo Corte + Barba',
    );
  });

  it('reconhece corte infantil por apelido', () => {
    expect(nomes(servicosQueFaltam([{ nome: 'Corte Kids' }]))).not.toContain('Corte Infantil');
    expect(nomes(servicosQueFaltam([{ nome: 'Corte para criança' }]))).not.toContain(
      'Corte Infantil',
    );
  });

  it('um serviço chamado só "Corte" conta como corte de cabelo', () => {
    expect(nomes(servicosQueFaltam([{ nome: 'Corte' }]))).not.toContain('Corte de Cabelo');
  });

  it('barbearia com tudo não recebe nada', () => {
    expect(servicosQueFaltam(CATALOGO_PADRAO)).toHaveLength(0);
  });

  it('nome esquisito não impede o catálogo', () => {
    const faltam = servicosQueFaltam([{ nome: 'Sobrancelha' }, { nome: '' }]);
    expect(faltam).toHaveLength(CATALOGO_PADRAO.length);
  });
});

describe('paraCriar', () => {
  it('monta a linha do banco com o tenant certo', () => {
    expect(paraCriar(CATALOGO_PADRAO[0], 7)).toEqual({
      nome: 'Corte de Cabelo',
      descricao: expect.any(String),
      preco: 45,
      qtdeSlots: 1,
      ehCombo: false,
      imagemURL: '/servicos/corte-de-cabelo.jpg',
      tenantId: 7,
    });
  });

  it('não leva os apelidos para o banco', () => {
    const linha = paraCriar(CATALOGO_PADRAO[1], 1) as any;
    expect(linha.contem).toBeUndefined();
    expect(linha.exatos).toBeUndefined();
  });
});
