import { LembreteService } from './lembrete.service';

const AGORA = new Date('2026-08-07T13:00:00.000Z');

function candidato(over: any = {}) {
  return {
    id: 10,
    tenantId: 7,
    usuarioId: 3,
    data: new Date('2026-07-08T12:00:00.000Z'),
    usuario: { id: 3, nome: 'João', telefone: '11999990000', ativo: true },
    servicos: [{ id: 20, nome: 'Corte' }],
    ...over,
  };
}

function montar(opcoes: {
  configuracoes?: any;
  candidatos?: any[];
  posteriores?: any[];
  consentimentos?: any[];
  envioOk?: boolean;
} = {}) {
  const marcacoes: any[] = [];
  const prisma = {
    tenant: {
      findMany: jest.fn(async () => [
        {
          id: 7,
          nome: 'Lá Tita',
          configuracoes: opcoes.configuracoes ?? {
            lembreteRetorno: { ativo: true, dias: 30 },
            evolutionInstance: 'latita',
          },
        },
      ]),
    },
    agendamento: {
      findMany: jest.fn(async (args: any) => {
        // Antes do lembrete, a mesma execução encerra horários ativos cujo
        // serviço já terminou. Essa consulta não faz parte da fila de retorno.
        if (args.select?.servicos?.select?.qtdeSlots) return [];
        return 'retornoEnviadoEm' in args.where
          ? (opcoes.candidatos ?? [candidato()])
          : (opcoes.posteriores ?? []);
      }),
      updateMany: jest.fn(async (args: any) => {
        marcacoes.push(args);
        return { count: args.where.id.in.length };
      }),
    },
    consentimentoLgpd: {
      findMany: jest.fn(async () =>
        opcoes.consentimentos ?? [
          { titularId: 3, aceito: true, createdAt: new Date() },
        ],
      ),
    },
  };
  const whatsapp = {
    provedorConfigurado: true,
    configurado: false,
    enviarTexto: jest.fn(async () => opcoes.envioOk ?? true),
  };
  const service = new LembreteService(prisma as any, whatsapp as any);
  return { service, prisma, whatsapp, marcacoes };
}

describe('lembrete automático para o cliente retornar', () => {
  it.each([15, 20, 30, 40])('usa os %i dias escolhidos pela barbearia', async (dias) => {
    const { service, prisma } = montar({
      configuracoes: { lembreteRetorno: { ativo: true, dias } },
    });

    await service.dispararRetornos({ agora: AGORA });

    const consulta = prisma.agendamento.findMany.mock.calls
      .map(([args]: any[]) => args)
      .find((args: any) => 'retornoEnviadoEm' in args.where);
    expect(consulta.where.status).toBe('concluido');
    expect(consulta.where.data.lte).toEqual(
      new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000),
    );
    // Não consulta plano: Básico, Profissional e Premium passam pela mesma regra.
    const consultaTenant = (prisma.tenant.findMany as jest.Mock).mock.calls[0][0];
    expect(consultaTenant.where).not.toHaveProperty('assinatura');
  });

  it('não faz nada quando a barbearia deixou a automação desligada', async () => {
    const { service, prisma, whatsapp } = montar({
      configuracoes: { lembreteRetorno: { ativo: false, dias: 30 } },
    });
    const resposta = await service.dispararRetornos({ agora: AGORA });
    // A sincronização geral ainda roda, mas a fila de retorno não é consultada.
    const consultasDeRetorno = prisma.agendamento.findMany.mock.calls.filter(
      ([args]: any[]) => 'retornoEnviadoEm' in args.where,
    );
    expect(consultasDeRetorno).toHaveLength(0);
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled();
    expect(resposta.enviados).toBe(0);
  });

  it('só envia com consentimento específico do cliente', async () => {
    const { service, whatsapp, marcacoes } = montar({ consentimentos: [] });
    const resposta = await service.dispararRetornos({ agora: AGORA });
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled();
    expect(marcacoes).toHaveLength(0);
    expect(resposta.semConsentimento).toBe(1);
  });

  it('respeita a escolha mais recente quando o cliente revoga o consentimento', async () => {
    const { service, whatsapp } = montar({
      consentimentos: [
        { titularId: 3, aceito: false },
        { titularId: 3, aceito: true },
      ],
    });
    const resposta = await service.dispararRetornos({ agora: AGORA });
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled();
    expect(resposta.semConsentimento).toBe(1);
  });

  it('envia pelo WhatsApp da barbearia, cita o serviço e marca depois do sucesso', async () => {
    const { service, whatsapp, marcacoes } = montar();
    const resposta = await service.dispararRetornos({ agora: AGORA });

    expect(whatsapp.enviarTexto).toHaveBeenCalledWith(
      '11999990000',
      expect.stringContaining('Corte'),
      'latita',
    );
    expect((whatsapp.enviarTexto as jest.Mock).mock.calls[0][1]).toContain('30 dias');
    expect(marcacoes[0]).toMatchObject({
      where: { id: { in: [10] }, tenantId: 7, retornoEnviadoEm: null },
      data: { retornoEnviadoEm: AGORA },
    });
    expect(resposta).toMatchObject({ enviados: 1, marcados: 1, falhas: 0 });
  });

  it('se o mesmo serviço foi feito ou já está marcado depois, bloqueia o lembrete antigo', async () => {
    const { service, whatsapp, marcacoes } = montar({
      posteriores: [
        {
          id: 11,
          usuarioId: 3,
          data: new Date('2026-07-25T12:00:00.000Z'),
          servicos: [{ id: 20 }],
        },
      ],
    });
    const resposta = await service.dispararRetornos({ agora: AGORA });
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled();
    expect(marcacoes[0].where.id.in).toEqual([10]);
    expect(resposta.suprimidos).toBe(1);
  });

  it('junta serviços vencidos do mesmo cliente em uma mensagem só', async () => {
    const { service, whatsapp, marcacoes } = montar({
      candidatos: [
        candidato(),
        candidato({
          id: 12,
          data: new Date('2026-07-07T12:00:00.000Z'),
          servicos: [{ id: 21, nome: 'Barba' }],
        }),
      ],
    });
    await service.dispararRetornos({ agora: AGORA });
    expect(whatsapp.enviarTexto).toHaveBeenCalledTimes(1);
    expect((whatsapp.enviarTexto as jest.Mock).mock.calls[0][1]).toContain('Corte, Barba');
    expect(marcacoes[0].where.id.in.sort()).toEqual([10, 12]);
  });

  it('falha da Evolution não marca e o cliente volta na próxima rodada', async () => {
    const { service, marcacoes } = montar({ envioOk: false });
    const resposta = await service.dispararRetornos({ agora: AGORA });
    expect(marcacoes).toHaveLength(0);
    expect(resposta).toMatchObject({ enviados: 0, falhas: 1, marcados: 0 });
  });
});
