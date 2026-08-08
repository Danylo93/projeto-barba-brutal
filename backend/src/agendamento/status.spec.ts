import { normalizarStatus, STATUS_VALIDOS } from './status';

/**
 * Trava o que a rota gravava sem perguntar. Provado rodando antes da correção:
 * "inventado", "" e "CANCELADO" entravam no banco com HTTP 200.
 */
describe('normalizarStatus', () => {
  it('aceita os cinco status do sistema', () => {
    for (const s of STATUS_VALIDOS) {
      expect(normalizarStatus(s)).toBe(s);
    }
  });

  // O caso que custava dinheiro: os relatórios comparam com 'cancelado'
  // minúsculo, então um atendimento gravado como "CANCELADO" continuava
  // contando como receita e pagando comissão.
  it('normaliza a caixa em vez de gravar outro valor', () => {
    expect(normalizarStatus('CANCELADO')).toBe('cancelado');
    expect(normalizarStatus('Concluido')).toBe('concluido');
    expect(normalizarStatus('EXPIRADO')).toBe('expirado');
  });

  it('tolera espaço nas pontas, que é erro de integração', () => {
    expect(normalizarStatus('  confirmado ')).toBe('confirmado');
  });

  it('recusa status inventado', () => {
    expect(normalizarStatus('inventado')).toBeNull();
    expect(normalizarStatus('pago')).toBeNull();
    expect(normalizarStatus('cancelado!')).toBeNull();
  });

  it('recusa vazio', () => {
    expect(normalizarStatus('')).toBeNull();
    expect(normalizarStatus('   ')).toBeNull();
  });

  // Estes davam 500 antes; agora caem no 400 junto com os outros.
  it('recusa o que não é texto, em vez de derrubar', () => {
    expect(normalizarStatus(null)).toBeNull();
    expect(normalizarStatus(undefined)).toBeNull();
    expect(normalizarStatus(123)).toBeNull();
    expect(normalizarStatus({})).toBeNull();
    expect(normalizarStatus(['cancelado'])).toBeNull();
  });
});
