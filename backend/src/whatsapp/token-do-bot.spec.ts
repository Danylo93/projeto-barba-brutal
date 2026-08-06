import {
  ConfiguracaoDoBotInvalida,
  TokenDoBotInvalido,
  conferirTenantPedido,
  quemEsteTokenAutoriza,
} from './token-do-bot';

/**
 * O bot cria, lê e cancela agendamento. Errar aqui não é vazar listagem — é
 * deixar uma barbearia mexer na agenda da outra.
 */

describe('token do SaaS', () => {
  const config = { tokenGlobal: 'tok-do-n8n' };

  // O ponto da correção: este token NÃO escolhe barbearia. Antes ele aceitava
  // qualquer `?tenantId=` e abria todas de uma vez.
  it('não escolhe barbearia sozinho — pede a instância', () => {
    expect(quemEsteTokenAutoriza('tok-do-n8n', config)).toEqual({
      tipo: 'precisa-da-instancia',
    });
  });

  it('recusa token que não é o nosso', () => {
    expect(() => quemEsteTokenAutoriza('chute', config)).toThrow(TokenDoBotInvalido);
    expect(() => quemEsteTokenAutoriza('', config)).toThrow(TokenDoBotInvalido);
    expect(() => quemEsteTokenAutoriza(undefined, config)).toThrow(TokenDoBotInvalido);
  });
});

describe('token por barbearia', () => {
  const config = { tokensPorTenant: '{"1":"tok-um","2":"tok-dois"}' };

  it('o token resolve a barbearia sem precisar de mais nada', () => {
    expect(quemEsteTokenAutoriza('tok-um', config)).toEqual({
      tipo: 'barbearia',
      tenantId: 1,
    });
    expect(quemEsteTokenAutoriza('tok-dois', config)).toEqual({
      tipo: 'barbearia',
      tenantId: 2,
    });
  });

  it('convive com o token do SaaS', () => {
    const misto = { tokenGlobal: 'tok-saas', tokensPorTenant: '{"3":"tok-tres"}' };
    expect(quemEsteTokenAutoriza('tok-tres', misto)).toEqual({
      tipo: 'barbearia',
      tenantId: 3,
    });
    expect(quemEsteTokenAutoriza('tok-saas', misto)).toEqual({
      tipo: 'precisa-da-instancia',
    });
  });

  // "0", "-1" e "abc" não são barbearia. Descartadas todas, sobra um mapa
  // vazio — que é configuração faltando, não credencial errada.
  it('ignora entrada de mapa que não é barbearia de verdade', () => {
    const ruim = { tokensPorTenant: '{"0":"a","-1":"b","abc":"c"}' };
    for (const t of ['a', 'b', 'c']) {
      expect(() => quemEsteTokenAutoriza(t, ruim)).toThrow(ConfiguracaoDoBotInvalida);
    }
  });

  it('entrada inválida não autoriza, mas não derruba as válidas', () => {
    const misto = { tokensPorTenant: '{"0":"lixo","4":"tok-quatro"}' };
    expect(quemEsteTokenAutoriza('tok-quatro', misto)).toEqual({
      tipo: 'barbearia',
      tenantId: 4,
    });
    expect(() => quemEsteTokenAutoriza('lixo', misto)).toThrow(TokenDoBotInvalido);
  });
});

describe('configuração', () => {
  it('sem nada configurado, é erro do servidor e não do chamador', () => {
    expect(() => quemEsteTokenAutoriza('qualquer', {})).toThrow(
      ConfiguracaoDoBotInvalida,
    );
    expect(() => quemEsteTokenAutoriza('qualquer', { tokensPorTenant: '{}' })).toThrow(
      ConfiguracaoDoBotInvalida,
    );
  });

  it('mapa que não é JSON é erro de configuração', () => {
    expect(() => quemEsteTokenAutoriza('x', { tokensPorTenant: '{nao-e-json' })).toThrow(
      ConfiguracaoDoBotInvalida,
    );
    expect(() => quemEsteTokenAutoriza('x', { tokensPorTenant: '["lista"]' })).toThrow(
      ConfiguracaoDoBotInvalida,
    );
  });
});

describe('tenantId da URL', () => {
  it('quando bate, passa', () => {
    expect(conferirTenantPedido(7, '7')).toBe(7);
  });

  it('quando não vem, o resolvido vale', () => {
    expect(conferirTenantPedido(7, undefined)).toBe(7);
    expect(conferirTenantPedido(7, '')).toBe(7);
    expect(conferirTenantPedido(7, 'abc')).toBe(7);
  });

  // Era exatamente assim que se pulava de barbearia.
  it('quando diverge, recusa em vez de atender a outra', () => {
    expect(() => conferirTenantPedido(7, '8')).toThrow(TokenDoBotInvalido);
    expect(() => conferirTenantPedido(1, '2')).toThrow(TokenDoBotInvalido);
  });
});
