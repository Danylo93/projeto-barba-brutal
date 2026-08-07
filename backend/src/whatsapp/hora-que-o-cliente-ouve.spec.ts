import { WhatsappAgendaService } from './whatsapp-agenda.service';

/**
 * A hora que o robô fala em voz alta.
 *
 * Pego numa conversa de verdade, em produção: o agendamento estava gravado em
 * `2026-08-08T18:00:00.000Z`, que são 15:00 em Brasília, e o cliente recebeu
 * no WhatsApp "amanhã às 18h". Três horas de diferença, com a confiança toda
 * de quem leu no banco.
 *
 * A causa é boba e conhecida: `marcar` e `remarcar` já devolviam um campo
 * `quando` pronto, justamente para o modelo não ter que interpretar ISO — mas
 * `meus_agendamentos` devolvia só o `data` cru, terminado em Z. O modelo leu a
 * hora que estava escrita.
 *
 * Nenhum prompt conserta isto: a hora certa tem que sair da API já escrita do
 * jeito que o cliente lê.
 */

const TOKEN = 'token-do-bot-de-teste';
const TENANT = 14;

function montar(agendamentos: any[]) {
  const vazio = {} as any;
  const prisma: any = {
    assinatura: {
      findUnique: jest.fn(async () => ({
        status: 'active',
        dataFim: null,
        plano: { nome: 'Premium', features: ['robo-whatsapp'] },
      })),
    },
    usuario: {
      findMany: jest.fn(async () => [
        { id: 19, tenantId: TENANT, nome: 'Neymar', email: 'neymar@gmail.com', telefone: '11964891128', ativo: true },
      ]),
    },
  };
  const repo: any = { buscarPorUsuario: jest.fn(async () => agendamentos) };
  const service = new WhatsappAgendaService(
    prisma, repo, vazio, vazio, vazio, vazio, vazio,
  );
  return { service };
}

const AMBIENTE = { ...process.env };
beforeEach(() => {
  process.env.WHATSAPP_BOT_TOKENS = JSON.stringify({ [TENANT]: TOKEN });
  delete process.env.WHATSAPP_BOT_TOKEN;
});
afterEach(() => {
  process.env = { ...AMBIENTE };
});

describe('meus_agendamentos', () => {
  it('devolve a hora escrita como o cliente lê, e não o ISO em UTC', async () => {
    const { service } = montar([
      {
        id: 36,
        data: new Date('2026-08-08T18:00:00.000Z'),
        status: 'agendado',
        profissional: { nome: 'Patricia Pereira' },
        servicos: [{ nome: 'Barba', preco: 35 }],
      },
    ]);

    const lista: any[] = await service.listar(TOKEN, String(TENANT), '11964891128');

    expect(lista).toHaveLength(1);
    // 18:00Z são 15:00 aqui. Era isto que o cliente precisava ter ouvido.
    expect(lista[0].quando).toBe('08/08 às 15:00');
  });

  it('cada agendamento da lista sai com a sua hora', async () => {
    const { service } = montar([
      { id: 1, data: new Date('2026-08-08T18:00:00.000Z'), status: 'agendado' },
      { id: 2, data: new Date('2026-08-09T12:30:00.000Z'), status: 'confirmado' },
    ]);

    const lista: any[] = await service.listar(TOKEN, String(TENANT), '11964891128');
    expect(lista.map((a) => a.quando)).toEqual(['08/08 às 15:00', '09/08 às 09:30']);
  });

  it('continua escondendo cancelado e concluído', async () => {
    const { service } = montar([
      { id: 1, data: new Date('2026-08-08T18:00:00.000Z'), status: 'cancelado' },
      { id: 2, data: new Date('2026-08-08T19:00:00.000Z'), status: 'concluido' },
      { id: 3, data: new Date('2026-08-08T20:00:00.000Z'), status: 'agendado' },
    ]);

    const lista: any[] = await service.listar(TOKEN, String(TENANT), '11964891128');
    expect(lista.map((a) => a.id)).toEqual([3]);
  });

  it('agendamento sem data legível não derruba a lista', async () => {
    const { service } = montar([
      { id: 1, data: null, status: 'agendado' },
      { id: 2, data: new Date('2026-08-08T18:00:00.000Z'), status: 'agendado' },
    ]);

    const lista: any[] = await service.listar(TOKEN, String(TENANT), '11964891128');
    expect(lista).toHaveLength(2);
    expect(lista[0].quando).toBeNull();
    expect(lista[1].quando).toBe('08/08 às 15:00');
  });
});
