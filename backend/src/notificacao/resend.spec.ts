import {
  chaveDoResend,
  corpoDoEnvio,
  ehChaveSoDeEnvio,
  interpretarResposta,
  problemaDoRemetente,
  remetente,
} from './resend';

describe('corpoDoEnvio', () => {
  const base = {
    de: 'Barbearia Brutal <suporte@barbabrutal.com.br>',
    para: 'marcao@x.app',
    assunto: 'Redefinir sua senha',
    texto: 'Abra o link…',
    html: '<p>Abra o link…</p>',
  };

  it('manda o destinatário como lista, que é o que a API espera', () => {
    expect(corpoDoEnvio(base).to).toEqual(['marcao@x.app']);
  });

  it('leva HTML e texto puro juntos', () => {
    const corpo = corpoDoEnvio(base);
    expect(corpo.html).toBe('<p>Abra o link…</p>');
    expect(corpo.text).toBe('Abra o link…');
  });

  it('sem HTML, não manda o campo vazio', () => {
    const corpo = corpoDoEnvio({ ...base, html: undefined });
    expect(corpo).not.toHaveProperty('html');
    expect(corpo.text).toBe('Abra o link…');
  });

  it('repassa remetente e assunto sem mexer', () => {
    const corpo = corpoDoEnvio(base);
    expect(corpo.from).toBe(base.de);
    expect(corpo.subject).toBe('Redefinir sua senha');
  });
});

describe('interpretarResposta', () => {
  it('200 é sucesso e devolve o id do envio', () => {
    expect(interpretarResposta(200, { id: 'abc-123' })).toEqual({ ok: true, id: 'abc-123' });
  });

  it('201 também é sucesso', () => {
    expect(interpretarResposta(201, { id: 'x' }).ok).toBe(true);
  });

  // O motivo do Resend é específico e é justamente o que resolve o problema de
  // quem lê o log; trocar por texto genérico esconderia a causa.
  it('domínio não verificado chega com o motivo inteiro', () => {
    const r = interpretarResposta(403, {
      message: 'The barbabrutal.com.br domain is not verified',
    });
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('403');
    expect(r.erro).toContain('domain is not verified');
  });

  it('chave inválida vira erro legível', () => {
    const r = interpretarResposta(401, { message: 'API key is invalid' });
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('API key is invalid');
  });

  it('erro aninhado em error.message também é lido', () => {
    expect(interpretarResposta(422, { error: { message: 'campo faltando' } }).erro).toContain(
      'campo faltando',
    );
  });

  it('resposta sem corpo não estoura', () => {
    const r = interpretarResposta(500, undefined);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('500');
  });
});

describe('configuração', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('sem RESEND_API_KEY, não há chave', () => {
    delete process.env.RESEND_API_KEY;
    expect(chaveDoResend()).toBeUndefined();
  });

  it('chave só com espaço conta como ausente', () => {
    process.env.RESEND_API_KEY = '   ';
    expect(chaveDoResend()).toBeUndefined();
  });

  it('espaço em volta da chave é aparado — colar do painel costuma trazer', () => {
    process.env.RESEND_API_KEY = '  re_abc123  ';
    expect(chaveDoResend()).toBe('re_abc123');
  });

  it('EMAIL_FROM tem preferência sobre SMTP_FROM', () => {
    process.env.EMAIL_FROM = 'suporte@barbabrutal.com.br';
    process.env.SMTP_FROM = 'agenciafwdigital@gmail.com';
    expect(remetente()).toBe('suporte@barbabrutal.com.br');
  });

  it('sem EMAIL_FROM, usa o SMTP_FROM que já existe', () => {
    delete process.env.EMAIL_FROM;
    process.env.SMTP_FROM = 'agenciafwdigital@gmail.com';
    expect(remetente()).toBe('agenciafwdigital@gmail.com');
  });

  // Sem padrão de propósito: chutar um domínio trocaria um erro claro por um
  // 403 obscuro no meio do envio, ou faria o e-mail sair de um endereço que
  // não é o da empresa.
  it('sem nenhum dos dois, não inventa remetente', () => {
    delete process.env.EMAIL_FROM;
    delete process.env.SMTP_FROM;
    expect(remetente()).toBeUndefined();
  });
});

describe('ehChaveSoDeEnvio', () => {
  // Chave de "Sending access" envia mas não lista domínios. Reportar isso
  // como falha acusava o contrário do que era: a chave está boa.
  it('reconhece a chave restrita a envio', () => {
    expect(
      ehChaveSoDeEnvio('Resend respondeu 401: This API key is restricted to only send emails'),
    ).toBe(true);
  });

  it('chave inválida de verdade não é confundida com restrita', () => {
    expect(ehChaveSoDeEnvio('Resend respondeu 401: API key is invalid')).toBe(false);
  });

  it('sem erro nenhum, não é o caso', () => {
    expect(ehChaveSoDeEnvio(undefined)).toBe(false);
  });
});

describe('problemaDoRemetente', () => {
  it('domínio próprio passa', () => {
    expect(problemaDoRemetente('contato@barbeariabrutal.com.br')).toBeUndefined();
  });

  it('formato "Nome <e-mail>" também passa', () => {
    expect(
      problemaDoRemetente('Barbearia Brutal <contato@barbeariabrutal.com.br>'),
    ).toBeUndefined();
  });

  it('a caixa de teste do Resend passa', () => {
    expect(problemaDoRemetente('onboarding@resend.dev')).toBeUndefined();
  });

  // O sintoma em produção é péssimo: o e-mail não chega e o 403 fica só no
  // log. Melhor barrar antes, dizendo o porquê.
  it('gmail é barrado, com o motivo', () => {
    const p = problemaDoRemetente('agenciafwdigital@gmail.com');
    expect(p).toContain('gmail.com');
    expect(p).toContain('domínio público');
  });

  it('outros provedores públicos também', () => {
    for (const e of ['x@hotmail.com', 'x@outlook.com', 'x@yahoo.com.br', 'x@uol.com.br']) {
      expect(problemaDoRemetente(e)).toContain('domínio público');
    }
  });

  it('dentro de "Nome <...>" o gmail também é pego', () => {
    expect(problemaDoRemetente('Barbearia <agenciafwdigital@gmail.com>')).toContain(
      'domínio público',
    );
  });

  it('maiúscula não engana', () => {
    expect(problemaDoRemetente('X@GMAIL.COM')).toContain('domínio público');
  });

  it('sem remetente, cobra a variável', () => {
    expect(problemaDoRemetente(undefined)).toContain('EMAIL_FROM');
  });

  it('texto que não é e-mail é recusado', () => {
    expect(problemaDoRemetente('barbearia brutal')).toContain('não parece um e-mail');
  });
});
