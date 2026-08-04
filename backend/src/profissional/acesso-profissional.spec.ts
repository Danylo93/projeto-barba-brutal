import { mesmoEmail, normalizarEmail } from './acesso-profissional';

describe('normalizarEmail', () => {
  it('tira espaço das pontas, que quebra o login sem ninguém ver', () => {
    expect(normalizarEmail('  marcao@x.app ')).toBe('marcao@x.app');
  });

  // A caixa NÃO é alterada: o login compara o e-mail exato, e mexer aqui
  // deixaria de fora quem se cadastrou com maiúscula.
  it('não mexe na caixa', () => {
    expect(normalizarEmail('Marcao@X.app')).toBe('Marcao@X.app');
  });

  it('lida com valor ausente ou de outro tipo', () => {
    expect(normalizarEmail(undefined)).toBe('');
    expect(normalizarEmail(null)).toBe('');
    expect(normalizarEmail(42)).toBe('');
    expect(normalizarEmail({})).toBe('');
  });
});

describe('mesmoEmail', () => {
  // O Postgres deixaria as duas linhas conviverem, mas é a mesma caixa
  // postal — o barbeiro acabaria com duas contas.
  it('maiúscula e minúscula são a mesma caixa postal', () => {
    expect(mesmoEmail('Marcao@X.app', 'marcao@x.app')).toBe(true);
  });

  it('ignora espaço nas pontas', () => {
    expect(mesmoEmail(' marcao@x.app', 'marcao@x.app ')).toBe(true);
  });

  it('e-mails diferentes continuam diferentes', () => {
    expect(mesmoEmail('marcao@x.app', 'ze@x.app')).toBe(false);
  });

  it('vazio não casa com vazio', () => {
    expect(mesmoEmail('', '')).toBe(false);
    expect(mesmoEmail(undefined, undefined)).toBe(false);
    expect(mesmoEmail('  ', 'marcao@x.app')).toBe(false);
  });
});
