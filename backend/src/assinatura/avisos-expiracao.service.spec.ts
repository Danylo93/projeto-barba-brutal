import { AssinaturaService } from './assinatura.service';

const AGORA = new Date('2026-08-07T13:00:00.000Z');

function assinatura(over: any = {}) {
  return {
    id: 9,
    status: 'active',
    emTeste: false,
    dataFim: new Date('2026-08-08T12:00:00.000Z'),
    avisoVencimentoWhatsappEm: null,
    avisoVencimentoEmailEm: null,
    avisoExpiracaoWhatsappEm: null,
    avisoExpiracaoEmailEm: null,
    tenant: {
      nome: 'Lá Tita',
      telefone: '11999990000',
      email: 'dono@latita.com',
      configuracoes: { evolutionInstance: 'latita' },
    },
    plano: { nome: 'Premium' },
    ...over,
  };
}

function montar(opcoes: {
  vencendo?: any[];
  expiradas?: any[];
  whatsappOk?: boolean;
  emailAtivo?: boolean;
  emailFalha?: boolean;
} = {}) {
  const atualizacoes: any[] = [];
  const prisma = {
    assinatura: {
      findMany: jest.fn(async (args: any) =>
        args.where.dataFim.gt
          ? (opcoes.vencendo ?? [assinatura()])
          : (opcoes.expiradas ?? []),
      ),
      update: jest.fn(async (args: any) => {
        atualizacoes.push(args);
        return args;
      }),
    },
  };
  const whatsapp = {
    enviarTexto: jest.fn(async () => opcoes.whatsappOk ?? true),
  };
  const notificacao = {
    emailAtivo: opcoes.emailAtivo ?? true,
    enviarTemplate: jest.fn(async () => {
      if (opcoes.emailFalha) throw new Error('Resend indisponível');
    }),
  };
  const service = new AssinaturaService(
    prisma as any,
    whatsapp as any,
    notificacao as any,
  );
  return { service, prisma, whatsapp, notificacao, atualizacoes };
}

describe('avisos de expiração da assinatura', () => {
  it('avisa um dia antes por WhatsApp e e-mail e marca cada canal', async () => {
    const { service, whatsapp, notificacao, atualizacoes } = montar();

    const resposta = await service.dispararAvisosExpiracao({ agora: AGORA });

    expect(whatsapp.enviarTexto).toHaveBeenCalledWith(
      '11999990000',
      expect.stringContaining('vence amanhã'),
      'latita',
    );
    expect(notificacao.enviarTemplate).toHaveBeenCalledWith(
      'dono@latita.com',
      expect.objectContaining({ assunto: expect.stringContaining('vence amanhã') }),
    );
    expect(atualizacoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: { avisoVencimentoWhatsappEm: AGORA } }),
        expect.objectContaining({ data: { avisoVencimentoEmailEm: AGORA } }),
      ]),
    );
    expect(resposta).toMatchObject({
      consultadas: 1,
      whatsapp: { enviados: 1, falhas: 0 },
      email: { enviados: 1, falhas: 0 },
    });
  });

  it('avisa quando expirou e informa que os dados continuam guardados', async () => {
    const vencida = assinatura({
      dataFim: new Date('2026-08-07T12:00:00.000Z'),
    });
    const { service, whatsapp, atualizacoes } = montar({
      vencendo: [],
      expiradas: [vencida],
    });

    await service.dispararAvisosExpiracao({ agora: AGORA });

    expect((whatsapp.enviarTexto as jest.Mock).mock.calls[0][1]).toContain('expirou');
    expect((whatsapp.enviarTexto as jest.Mock).mock.calls[0][1]).toContain('dados continuam guardados');
    expect(atualizacoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: { avisoExpiracaoWhatsappEm: AGORA } }),
        expect.objectContaining({ data: { avisoExpiracaoEmailEm: AGORA } }),
      ]),
    );
  });

  it('não duplica o WhatsApp quando só o e-mail ainda está pendente', async () => {
    const pendente = assinatura({
      avisoVencimentoWhatsappEm: new Date('2026-08-07T12:30:00.000Z'),
    });
    const { service, whatsapp, notificacao, atualizacoes } = montar({
      vencendo: [pendente],
    });

    await service.dispararAvisosExpiracao({ agora: AGORA });

    expect(whatsapp.enviarTexto).not.toHaveBeenCalled();
    expect(notificacao.enviarTemplate).toHaveBeenCalledTimes(1);
    expect(atualizacoes).toEqual([
      expect.objectContaining({ data: { avisoVencimentoEmailEm: AGORA } }),
    ]);
  });

  it('mantém somente os canais que falharam na fila da próxima rodada', async () => {
    const { service, atualizacoes } = montar({ emailFalha: true });

    const resposta = await service.dispararAvisosExpiracao({ agora: AGORA });

    expect(atualizacoes).toEqual([
      expect.objectContaining({ data: { avisoVencimentoWhatsappEm: AGORA } }),
    ]);
    expect(resposta).toMatchObject({
      whatsapp: { enviados: 1 },
      email: { enviados: 0, falhas: 1 },
    });
  });

  it('identifica o trial como acesso Premium nos dois avisos', async () => {
    const emTeste = assinatura({ status: 'trialing', emTeste: true, plano: { nome: 'Básico' } });
    const { service, whatsapp } = montar({ vencendo: [emTeste] });

    await service.dispararAvisosExpiracao({ agora: AGORA });

    expect((whatsapp.enviarTexto as jest.Mock).mock.calls[0][1]).toContain('acesso Premium');
  });
});
