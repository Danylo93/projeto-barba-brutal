import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsappAgendaService } from './whatsapp-agenda.service';

describe('cadastro do cliente no atendimento por WhatsApp', () => {
  const usuarios: any[] = [];
  const auth = {
    registerUsuario: jest.fn(async (dados: any) => {
      const usuario = { id: 91, barbeiro: false, ativo: true, ...dados };
      usuarios.push(usuario);
      return { access_token: 'token', usuario };
    }),
  };
  const recuperacao = { enviarPrimeiroAcesso: jest.fn(async () => undefined) };
  const lgpd = { registrar: jest.fn(async () => ({ registrados: 2 })) };
  const notificacao = {
    emailAtivo: true,
    notificarNovoAgendamento: jest.fn(async () => undefined),
  };
  const agendamentos = {
    salvar: jest.fn(async () => 44),
    buscarPorId: jest.fn(async () => ({
      id: 44,
      usuarioId: 91,
      status: 'agendado',
      servicos: [{ id: 20, nome: 'Barba' }],
    })),
    buscarPorUsuario: jest.fn(async () => []),
  };
  const whatsapp = {};
  const prisma = {
    assinatura: {
      findUnique: jest.fn(async () => ({
        status: 'active',
        dataFim: new Date('2099-01-01T00:00:00Z'),
        plano: { nome: 'Profissional', features: [] },
      })),
    },
    usuario: {
      findMany: jest.fn(async ({ where }: any) =>
        usuarios.filter((u) => u.tenantId === where.tenantId && u.ativo !== false),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        usuarios.find((u) => u.tenantId === where.tenantId && u.email === where.email) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const usuario = usuarios.find((u) => u.id === where.id);
        Object.assign(usuario, data);
        return usuario;
      }),
    },
    tenant: {
      findUnique: jest.fn(async () => ({ nome: 'Lá Tita' })),
    },
  };

  let service: WhatsappAgendaService;

  beforeEach(() => {
    usuarios.length = 0;
    jest.clearAllMocks();
    process.env.WHATSAPP_BOT_TOKENS = JSON.stringify({ 7: 'token-da-tita' });
    process.env.FRONTEND_URL = 'https://barbeariabrutal.com';
    service = new WhatsappAgendaService(
      prisma as any,
      agendamentos as any,
      whatsapp as any,
      auth as any,
      recuperacao as any,
      lgpd as any,
      notificacao as any,
    );
  });

  it('oferece o link certo quando o número ainda não tem conta', async () => {
    const status = await service.statusCliente(
      'token-da-tita',
      '7',
      '11999990000',
    );

    expect(status.cadastrado).toBe(false);
    expect(status.cadastroUrl).toBe(
      'https://barbeariabrutal.com/login?tenant=7&modo=cadastrar&destino=%2Fagendamento',
    );
    expect(status.termosUrl).toBe('https://barbeariabrutal.com/terms');
    expect(status.privacidadeUrl).toBe('https://barbeariabrutal.com/privacy');
  });

  it('não cria conta sem aceite explícito dos documentos', async () => {
    await expect(
      service.cadastrarCliente(
        'token-da-tita',
        '7',
        {
          telefone: '11999990000',
          nome: 'João da Silva',
          email: 'joao@x.app',
          aceitouTermos: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(auth.registerUsuario).not.toHaveBeenCalled();
  });

  it('não confunde o texto "false" com aceite', async () => {
    await expect(
      service.cadastrarCliente(
        'token-da-tita',
        '7',
        {
          telefone: '11999990000',
          nome: 'João da Silva',
          email: 'joao@x.app',
          aceitouTermos: 'false' as any,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(auth.registerUsuario).not.toHaveBeenCalled();
  });

  it('não cria nem completa conta com e-mail inválido', async () => {
    usuarios.push({
      id: 40,
      tenantId: 7,
      nome: 'Cliente WhatsApp',
      email: 'whatsapp.5511999990000.7@cliente.local',
      telefone: '11999990000',
      ativo: true,
    });

    await expect(
      service.cadastrarCliente('token-da-tita', '7', {
        telefone: '11999990000',
        nome: 'João da Silva',
        email: 'email-invalido',
        aceitouTermos: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(auth.registerUsuario).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('cria a conta real, registra o aceite e envia o primeiro acesso por e-mail', async () => {
    const resposta = await service.cadastrarCliente(
      'token-da-tita',
      '7',
      {
        telefone: '5511999990000',
        nome: '  João   da Silva  ',
        email: '  JOAO@X.APP ',
        aceitouTermos: true,
        aceitouLembretes: true,
      },
    );

    expect(auth.registerUsuario).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'João da Silva',
        email: 'joao@x.app',
        telefone: '11999990000',
        tenantId: 7,
      }),
    );
    expect(auth.registerUsuario.mock.calls[0][0].senha).toHaveLength(64);
    expect(lgpd.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ titularTipo: 'usuario', titularId: 91, tenantId: 7 }),
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'termos_de_uso', aceito: true }),
        expect.objectContaining({ tipo: 'politica_privacidade', aceito: true }),
        expect.objectContaining({ tipo: 'comunicacoes_whatsapp', aceito: true }),
      ]),
      expect.any(Object),
    );
    expect(recuperacao.enviarPrimeiroAcesso).toHaveBeenCalledWith(
      expect.objectContaining({ id: 91, email: 'joao@x.app', tenantId: 7 }),
      'Lá Tita',
    );
    expect(resposta).toMatchObject({ cadastrado: true, emailEnviado: true });
  });

  it('não abre conta provisória ao tentar marcar com número desconhecido', async () => {
    await expect(
      service.criar('token-da-tita', '7', {
        telefone: '11988880000',
        profissionalId: 3,
        servicos: '20',
        data: '2098-08-08 15:00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(auth.registerUsuario).not.toHaveBeenCalled();
    expect(agendamentos.salvar).not.toHaveBeenCalled();
  });

  it('completa a conta provisória antiga sem perder os agendamentos dela', async () => {
    usuarios.push({
      id: 40,
      tenantId: 7,
      nome: 'Cliente WhatsApp',
      email: 'whatsapp.5555999990000.7@cliente.local',
      telefone: '5555999990000',
      ativo: true,
    });

    const status = await service.statusCliente('token-da-tita', '7', '55999990000');
    expect(status).toMatchObject({ cadastrado: false, cadastroIncompleto: true });

    await service.cadastrarCliente('token-da-tita', '7', {
      telefone: '55999990000',
      nome: 'Maria de Souza',
      email: 'maria@x.app',
      aceitouTermos: true,
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 40 },
      data: {
        nome: 'Maria de Souza',
        email: 'maria@x.app',
        telefone: '55999990000',
      },
    });
    expect(auth.registerUsuario).not.toHaveBeenCalled();
    expect(recuperacao.enviarPrimeiroAcesso).toHaveBeenCalledWith(
      expect.objectContaining({ id: 40, email: 'maria@x.app' }),
      'Lá Tita',
    );
  });

  it('manda o mesmo e-mail de confirmação do app depois de marcar', async () => {
    usuarios.push({
      id: 91,
      tenantId: 7,
      nome: 'João',
      email: 'joao@x.app',
      telefone: '11999990000',
      ativo: true,
    });

    await service.criar('token-da-tita', '7', {
      telefone: '5511999990000',
      profissionalId: 3,
      servicos: '20',
      data: '2027-08-08 15:00',
    });

    expect(agendamentos.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 7, usuarioId: 91, servicos: [20] }),
    );
    expect(notificacao.notificarNovoAgendamento).toHaveBeenCalledWith(44);
  });

  it('não oferece cancelado ou concluído para remarcar e cancelar', async () => {
    usuarios.push({
      id: 91,
      tenantId: 7,
      nome: 'João',
      email: 'joao@x.app',
      telefone: '11999990000',
      ativo: true,
    });
    agendamentos.buscarPorUsuario.mockResolvedValueOnce([
      { id: 1, status: 'agendado' },
      { id: 2, status: 'cancelado' },
      { id: 3, status: 'concluido' },
      { id: 4, status: 'confirmado' },
    ] as any);

    // Comparação por id: o que este teste protege é o FILTRO de status. A
    // lista carrega mais campos (o `quando` já escrito, por exemplo), e
    // comparar o objeto inteiro fazia este teste cair a cada campo novo.
    const lista: any[] = await service.listar('token-da-tita', '7', '5511999990000');
    expect(lista.map((a) => ({ id: a.id, status: a.status }))).toEqual([
      { id: 1, status: 'agendado' },
      { id: 4, status: 'confirmado' },
    ]);
  });
});
