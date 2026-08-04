import { DOMINIOS, OPCOES_DE_DOMINIO, dominioDaOpcao } from './dominio';
import { pagamentoRenovaPlano } from './mercadopago-assinatura';

describe('adicional de domínio', () => {
  it('cobra 29,90 de quem já tem domínio e 69,90 de quem não tem', () => {
    expect(DOMINIOS.proprio.preco).toBe(29.9);
    expect(DOMINIOS.novo.preco).toBe(69.9);
  });

  it('aceita as duas opções', () => {
    expect(dominioDaOpcao('proprio')?.preco).toBe(29.9);
    expect(dominioDaOpcao('novo')?.preco).toBe(69.9);
    expect(dominioDaOpcao(' NOVO ')?.preco).toBe(69.9);
  });

  // Cair num padrão aqui é cobrar a menos e prometer a mais.
  it('recusa opção desconhecida em vez de escolher por conta', () => {
    expect(dominioDaOpcao('')).toBeNull();
    expect(dominioDaOpcao(undefined)).toBeNull();
    expect(dominioDaOpcao('gratis')).toBeNull();
    expect(dominioDaOpcao(29.9)).toBeNull();
  });

  // O adicional já renovou plano de graça uma vez. Se alguém criar uma terceira
  // opção e esquecer de blindar, este teste cai junto.
  it('nenhuma opção renova o plano', () => {
    for (const d of OPCOES_DE_DOMINIO) {
      expect(d.metodo.startsWith('pix_dominio')).toBe(true);
      expect(pagamentoRenovaPlano({ metodo: d.metodo })).toBe(false);
    }
  });

  it('cada opção diz o que a barbearia está comprando', () => {
    for (const d of OPCOES_DE_DOMINIO) {
      expect(d.titulo).toContain('Domínio Próprio');
      expect(d.resumo.length).toBeGreaterThan(20);
    }
  });
});
