import { novaSessao, sessaoValida } from './sessao';

describe('sessão única', () => {
  it('gera identificadores diferentes a cada login', () => {
    const gerados = new Set(Array.from({ length: 50 }, novaSessao));
    expect(gerados.size).toBe(50);
  });

  it('aceita o token da sessão vigente', () => {
    const sid = novaSessao();
    expect(sessaoValida(sid, sid)).toBe(true);
  });

  // O ponto da mudança: entrar de novo derruba quem estava antes.
  it('recusa o token da sessão anterior', () => {
    const antiga = novaSessao();
    const nova = novaSessao();
    expect(sessaoValida(antiga, nova)).toBe(false);
  });

  // Falha fechada: token emitido antes desta mudança não tem `sid`, e conta
  // que nunca logou não tem `sessaoId`. Nenhum dos dois pode passar.
  it('recusa token sem sid e conta sem sessão', () => {
    expect(sessaoValida(undefined, novaSessao())).toBe(false);
    expect(sessaoValida('', novaSessao())).toBe(false);
    expect(sessaoValida(novaSessao(), null)).toBe(false);
    expect(sessaoValida(undefined, null)).toBe(false);
    expect(sessaoValida(null, null)).toBe(false);
  });

  // Um objeto no lugar da string não pode virar "igual a qualquer coisa".
  it('recusa sid que não é string', () => {
    expect(sessaoValida({ toString: () => 'x' } as any, 'x')).toBe(false);
    expect(sessaoValida(123 as any, '123')).toBe(false);
  });
});
