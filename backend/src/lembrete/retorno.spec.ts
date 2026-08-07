import {
  CONFIGURACAO_RETORNO_PADRAO,
  configuracaoDeRetorno,
  configuracaoDeRetornoValida,
} from './retorno';

describe('configuração do lembrete de retorno', () => {
  it.each([15, 20, 30, 40])('aceita %i dias', (dias) => {
    expect(configuracaoDeRetorno({ lembreteRetorno: { ativo: true, dias } })).toEqual({
      ativo: true,
      dias,
    });
  });

  it('intervalo inventado não ativa a automação', () => {
    expect(configuracaoDeRetorno({ lembreteRetorno: { ativo: true, dias: 1 } })).toEqual(
      CONFIGURACAO_RETORNO_PADRAO,
    );
  });

  it('exige boolean real e não confunde texto com true', () => {
    expect(
      configuracaoDeRetorno({ lembreteRetorno: { ativo: 'true', dias: 30 } }),
    ).toEqual({ ativo: false, dias: 30 });
  });

  it('valida o payload que o dono tenta salvar', () => {
    expect(configuracaoDeRetornoValida({ ativo: false, dias: 20 })).toBe(true);
    expect(configuracaoDeRetornoValida({ ativo: true, dias: 25 })).toBe(false);
    expect(configuracaoDeRetornoValida(null)).toBe(false);
  });
});
