import {
  ConfiguracaoDoBotInvalida,
  MOTIVO_GLOBAL_SEM_TENANT,
  TokenDoBotInvalido,
  tenantDoToken,
} from './token-do-bot';

/**
 * O bot de WhatsApp cria, lê e cancela agendamento. Errar aqui não é vazar
 * listagem — é deixar uma barbearia mexer na agenda da outra.
 */

describe('token por barbearia', () => {
  const config = { tokensPorTenant: '{"1":"tok-um","2":"tok-dois"}' };

  it('descobre a barbearia pelo token', () => {
    expect(tenantDoToken('tok-um', undefined, config)).toBe(1);
    expect(tenantDoToken('tok-dois', undefined, config)).toBe(2);
  });

  it('confere quando o pedido bate', () => {
    expect(tenantDoToken('tok-um', '1', config)).toBe(1);
  });

  // O furo: com o token da barbearia 1, trocar o número na URL abria a 2.
  it('recusa token de uma barbearia pedindo outra', () => {
    expect(() => tenantDoToken('tok-um', '2', config)).toThrow(TokenDoBotInvalido);
    expect(() => tenantDoToken('tok-dois', '1', config)).toThrow(TokenDoBotInvalido);
  });

  it('recusa token desconhecido', () => {
    expect(() => tenantDoToken('chute', '1', config)).toThrow(TokenDoBotInvalido);
    expect(() => tenantDoToken('', '1', config)).toThrow(TokenDoBotInvalido);
    expect(() => tenantDoToken(undefined, '1', config)).toThrow(TokenDoBotInvalido);
  });
});

describe('token único', () => {
  // Era assim que estava: token global + qualquer tenantId na query.
  it('não vale sem dizer de qual barbearia é', () => {
    expect(() => tenantDoToken('tok', '1', { tokenGlobal: 'tok' })).toThrow(
      ConfiguracaoDoBotInvalida,
    );
    expect(() => tenantDoToken('tok', '1', { tokenGlobal: 'tok' })).toThrow(
      MOTIVO_GLOBAL_SEM_TENANT,
    );
  });

  it('com a barbearia declarada, vale só para ela', () => {
    const config = { tokenGlobal: 'tok', tenantDoTokenGlobal: '7' };
    expect(tenantDoToken('tok', '7', config)).toBe(7);
    expect(tenantDoToken('tok', undefined, config)).toBe(7);
    expect(() => tenantDoToken('tok', '8', config)).toThrow(TokenDoBotInvalido);
  });

  it('barbearia declarada inválida não vira zero nem NaN', () => {
    for (const valor of ['0', '-1', 'abc', '']) {
      expect(() =>
        tenantDoToken('tok', '1', { tokenGlobal: 'tok', tenantDoTokenGlobal: valor }),
      ).toThrow(ConfiguracaoDoBotInvalida);
    }
  });
});

describe('configuração ruim', () => {
  it('mapa que não é JSON é erro de configuração, não de credencial', () => {
    expect(() => tenantDoToken('x', '1', { tokensPorTenant: '{nao-e-json' })).toThrow(
      ConfiguracaoDoBotInvalida,
    );
    expect(() => tenantDoToken('x', '1', { tokensPorTenant: '["lista"]' })).toThrow(
      ConfiguracaoDoBotInvalida,
    );
  });

  it('sem nada configurado, nenhum token entra', () => {
    expect(() => tenantDoToken('qualquer', '1', {})).toThrow(TokenDoBotInvalido);
    expect(() => tenantDoToken('qualquer', '1', { tokensPorTenant: '{}' })).toThrow(
      TokenDoBotInvalido,
    );
  });

  it('token vazio no mapa não autoriza ninguém', () => {
    expect(() =>
      tenantDoToken('', '1', { tokensPorTenant: '{"1":"  "}' }),
    ).toThrow(TokenDoBotInvalido);
  });
});
