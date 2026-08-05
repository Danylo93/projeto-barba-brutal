import { NotificacaoService } from './notificacao.service';

/**
 * Testa o envio pelo Resend com a rede interceptada. O que importa aqui é o
 * que sai no fio — URL, cabeçalho de autorização e corpo — e o que acontece
 * quando a API recusa.
 */
describe('NotificacaoService com Resend', () => {
  const ambienteOriginal = { ...process.env };
  const fetchOriginal = global.fetch;
  let chamadas: { url: string; init: any }[];

  function responderCom(status: number, corpo: any) {
    global.fetch = jest.fn(async (url: any, init: any) => {
      chamadas.push({ url: String(url), init });
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => corpo,
      } as any;
    }) as any;
  }

  beforeEach(() => {
    chamadas = [];
    process.env = { ...ambienteOriginal };
    delete process.env.SMTP_HOST;
    process.env.RESEND_API_KEY = 're_chave_de_teste';
    process.env.EMAIL_FROM = 'Barbearia Brutal <suporte@barbabrutal.com.br>';
  });

  afterEach(() => {
    process.env = { ...ambienteOriginal };
    global.fetch = fetchOriginal;
  });

  const criar = () => new NotificacaoService({} as any, {} as any);

  it('escolhe o Resend quando há chave, mesmo sem SMTP', () => {
    expect(criar().canal).toBe('resend');
  });

  it('o Resend ganha do SMTP — é o que funciona onde estamos hospedados', () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    expect(criar().canal).toBe('resend');
  });

  it('sem chave, volta para o SMTP', () => {
    delete process.env.RESEND_API_KEY;
    process.env.SMTP_HOST = 'smtp.gmail.com';
    expect(criar().canal).toBe('smtp');
  });

  it('sem nada configurado, o e-mail só vai para o log', () => {
    delete process.env.RESEND_API_KEY;
    const s = criar();
    expect(s.canal).toBe('nenhum');
    expect(s.emailAtivo).toBe(false);
  });

  it('manda para a API do Resend, com a chave no cabeçalho', async () => {
    responderCom(200, { id: 'env-1' });
    await criar().enviarEmail('marcao@x.app', 'Assunto', 'texto', '<p>html</p>');

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].url).toBe('https://api.resend.com/emails');
    expect(chamadas[0].init.method).toBe('POST');
    expect(chamadas[0].init.headers.Authorization).toBe('Bearer re_chave_de_teste');
  });

  it('o corpo leva remetente, destinatário, assunto, html e texto', async () => {
    responderCom(200, { id: 'env-1' });
    await criar().enviarEmail('marcao@x.app', 'Assunto', 'texto puro', '<p>html</p>');

    const corpo = JSON.parse(chamadas[0].init.body);
    expect(corpo).toEqual({
      from: 'Barbearia Brutal <suporte@barbabrutal.com.br>',
      to: ['marcao@x.app'],
      subject: 'Assunto',
      text: 'texto puro',
      html: '<p>html</p>',
    });
  });

  it('não fica pendurado: o envio tem prazo', async () => {
    responderCom(200, { id: 'env-1' });
    await criar().enviarEmail('marcao@x.app', 'Assunto', 'texto');
    expect(chamadas[0].init.signal).toBeDefined();
  });

  // Sem isto, "domínio não verificado" viraria um sucesso silencioso e ninguém
  // descobriria por que o e-mail não chega.
  it('recusa da API vira erro, com o motivo junto', async () => {
    responderCom(403, { message: 'The barbabrutal.com.br domain is not verified' });
    await expect(
      criar().enviarEmail('marcao@x.app', 'Assunto', 'texto'),
    ).rejects.toThrow(/domain is not verified/);
  });

  it('chave inválida também estoura, em vez de passar batido', async () => {
    responderCom(401, { message: 'API key is invalid' });
    await expect(
      criar().enviarEmail('marcao@x.app', 'Assunto', 'texto'),
    ).rejects.toThrow(/API key is invalid/);
  });

  it('em segundo plano, a falha não sobe para quem chamou', async () => {
    responderCom(500, { message: 'boom' });
    const s = criar();
    expect(() =>
      s.enviarTemplateEmSegundoPlano('marcao@x.app', {
        assunto: 'a',
        texto: 'b',
        html: '<p>c</p>',
      }),
    ).not.toThrow();
    // Deixa o catch interno rodar antes do teste acabar.
    await new Promise((r) => setTimeout(r, 10));
  });

  it('o teste de conexão confere a chave sem gastar envio', async () => {
    responderCom(200, { data: [] });
    const r = await criar().testarConexao();
    expect(r.ok).toBe(true);
    expect(chamadas[0].url).toBe('https://api.resend.com/domains');
  });

  it('o teste de conexão devolve o motivo quando a chave não presta', async () => {
    responderCom(401, { message: 'API key is invalid' });
    const r = await criar().testarConexao();
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('API key is invalid');
  });

  describe('sem EMAIL_FROM', () => {
    beforeEach(() => {
      delete process.env.EMAIL_FROM;
      delete process.env.SMTP_FROM;
    });

    // O Resend recusa remetente de domínio não verificado. Falhar aqui, com o
    // nome da variável que falta, é muito melhor do que mandar e tomar 403.
    it('nem tenta enviar, e diz qual variável falta', async () => {
      responderCom(200, { id: 'x' });
      await expect(
        criar().enviarEmail('marcao@x.app', 'Assunto', 'texto'),
      ).rejects.toThrow(/EMAIL_FROM/);
      expect(chamadas).toHaveLength(0);
    });

    it('o health também acusa antes de gastar chamada', async () => {
      responderCom(200, { data: [] });
      const r = await criar().testarConexao();
      expect(r.ok).toBe(false);
      expect(r.erro).toContain('EMAIL_FROM');
      expect(chamadas).toHaveLength(0);
    });
  });
});
