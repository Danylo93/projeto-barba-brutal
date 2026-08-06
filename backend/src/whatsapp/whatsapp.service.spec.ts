import { WhatsappService } from './whatsapp.service';

function respostaJson(status: number, dados: any): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(dados),
  } as unknown as Response;
}

describe('WhatsappService - conexão da Evolution', () => {
  const ambienteOriginal = process.env;
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = {
      ...ambienteOriginal,
      EVOLUTION_URL: 'https://evolution.exemplo.com/',
      EVOLUTION_APIKEY: 'segredo-global',
      EVOLUTION_MANAGER_URL: 'https://evolution.exemplo.com/manager/',
      WHATSAPP_WEBHOOK_URL:
        'https://n8n.exemplo.com/webhook/webhook-whatsapp',
      WHATSAPP_WEBHOOK_TOKEN: 'segredo-do-webhook',
    };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = ambienteOriginal;
    global.fetch = fetchOriginal;
  });

  it('orienta a criação quando o tenant ainda não tem instance', async () => {
    const service = new WhatsappService();

    await expect(service.obterConexao('')).resolves.toMatchObject({
      status: 'sem_instance',
      instance: null,
      managerUrl: 'https://evolution.exemplo.com/manager',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('consulta a instance com a apikey apenas no servidor', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      respostaJson(200, { instance: { state: 'open' } }),
    );
    const service = new WhatsappService();

    const conexao = await service.obterConexao('barbearia-centro');

    expect(conexao).toMatchObject({
      status: 'conectada',
      instance: 'barbearia-centro',
      evolutionState: 'open',
    });
    expect(conexao).not.toHaveProperty('apikey');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://evolution.exemplo.com/instance/connectionState/barbearia-centro',
      expect.objectContaining({
        headers: { apikey: 'segredo-global' },
      }),
    );
  });

  it('diferencia instance inexistente de WhatsApp desconectado', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(respostaJson(404, {}));
    const service = new WhatsappService();

    await expect(service.obterConexao('nao-existe')).resolves.toMatchObject({
      status: 'nao_encontrada',
      instance: 'nao-existe',
    });
  });

  it('normaliza e devolve o QR Code de uma instance desconectada', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        respostaJson(200, { instance: { state: 'close' } }),
      )
      .mockResolvedValueOnce(
        respostaJson(200, {
          base64: 'YWJj',
          pairingCode: '12345678',
        }),
      );
    const service = new WhatsappService();

    await expect(service.obterQrCode('barbearia-centro')).resolves.toMatchObject({
      status: 'conectando',
      qrCode: 'data:image/png;base64,YWJj',
      pairingCode: '12345678',
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://evolution.exemplo.com/instance/connect/barbearia-centro',
      expect.objectContaining({ headers: { apikey: 'segredo-global' } }),
    );
  });

  it('não tenta gerar QR quando a instance já está conectada', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      respostaJson(200, { instance: { state: 'open' } }),
    );
    const service = new WhatsappService();

    await expect(service.obterQrCode('barbearia-centro')).resolves.toMatchObject({
      status: 'conectada',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('informa quando as credenciais do SaaS ainda não foram configuradas', async () => {
    delete process.env.EVOLUTION_APIKEY;
    const service = new WhatsappService();

    await expect(service.obterConexao('barbearia-centro')).resolves.toMatchObject({
      status: 'nao_configurada',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('configura URL, evento e autenticação do webhook na Evolution', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(respostaJson(201, {}));
    const service = new WhatsappService();

    await expect(
      service.configurarWebhook('barbearia-centro'),
    ).resolves.toMatchObject({
      status: 'configurado',
      instance: 'barbearia-centro',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://evolution.exemplo.com/webhook/set/barbearia-centro',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: 'segredo-global',
        },
      }),
    );
    const opcoes = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(opcoes.body)).toEqual({
      webhook: {
        enabled: true,
        url: 'https://n8n.exemplo.com/webhook/webhook-whatsapp',
        headers: { 'x-whatsapp-token': 'segredo-do-webhook' },
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT'],
      },
    });
  });

  it('não configura webhook sem URL e token definidos no backend', async () => {
    delete process.env.WHATSAPP_WEBHOOK_URL;
    delete process.env.WHATSAPP_WEBHOOK_TOKEN;
    delete process.env.WHATSAPP_BOT_TOKEN;
    const service = new WhatsappService();

    await expect(
      service.configurarWebhook('barbearia-centro'),
    ).resolves.toMatchObject({ status: 'nao_configurado' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reutiliza o token do bot quando não há token exclusivo do webhook', async () => {
    delete process.env.WHATSAPP_WEBHOOK_TOKEN;
    process.env.WHATSAPP_BOT_TOKEN = 'token-do-bot';
    (global.fetch as jest.Mock).mockResolvedValueOnce(respostaJson(201, {}));
    const service = new WhatsappService();

    await expect(
      service.configurarWebhook('barbearia-centro'),
    ).resolves.toMatchObject({ status: 'configurado' });

    const opcoes = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(opcoes.body).webhook.headers).toEqual({
      'x-whatsapp-token': 'token-do-bot',
    });
  });
});
