import { PublicoService } from './publico.service';

/**
 * A rota pública é o único caminho que grava sem token. Estes testes existem
 * para que cada promessa do cabeçalho do serviço tenha um teste capaz de
 * falhar — e para que quem mexer aqui amanhã descubra o que quebrou antes de
 * o cliente descobrir.
 */

const MARCAO = {
  id: 1,
  nome: 'Barbearia do Marcão',
  dominio: 'marcao',
  agendamentoSemConta: true,
};
const LATITA = { id: 2, nome: 'Lá Tita', dominio: 'latita', agendamentoSemConta: false };

function montar(opcoes: { usuarios?: any[]; tenants?: any[] } = {}) {
  const tenants = opcoes.tenants ?? [MARCAO, LATITA];
  const usuarios: any[] = (opcoes.usuarios ?? []).map((u) => ({ ...u }));
  const salvos: any[] = [];

  const prisma = {
    tenant: {
      findFirst: jest.fn(async ({ where }: any) => {
        const alvos: string[] = [];
        for (const clausula of where.OR ?? []) {
          if (clausula.dominio) alvos.push(clausula.dominio);
          if (clausula.dominiosAntigos?.has) alvos.push(clausula.dominiosAntigos.has);
        }
        return tenants.find((t) => alvos.includes(t.dominio)) ?? null;
      }),
    },
    profissional: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === 10 && where.tenantId === 1 ? { id: 10 } : null,
      ),
    },
    usuario: {
      findFirst: jest.fn(async ({ where }: any) => {
        const telefones = (where.OR ?? [{ telefone: where.telefone }])
          .map((c: any) => c.telefone)
          .filter(Boolean);
        return (
          usuarios.find(
            (u) => u.tenantId === where.tenantId && telefones.includes(u.telefone),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const criado = { ...data, id: 900 + usuarios.length };
        usuarios.push(criado);
        return criado;
      }),
    },
  };

  const agendamentos = {
    salvar: jest.fn(async (dados: any) => {
      salvos.push(dados);
      return 36;
    }),
    buscarPorId: jest.fn(async () => ({
      id: 36,
      data: new Date('2026-08-15T18:00:00Z'),
      status: 'agendado',
      valorTotal: 45,
      profissional: { id: 10, nome: 'Marcão' },
      // O repositório devolve o cliente junto; o serviço não pode repassar.
      usuario: { id: 900, nome: 'João', email: 'joao@exemplo.com' },
      usuarioId: 900,
      tenantId: 1,
      servicos: [{ id: 19, nome: 'Corte de Cabelo', preco: 45 }],
      sinalValor: null,
      sinalStatus: 'nao_exigido',
    })),
    buscarPorProfissional: jest.fn(async () => []),
    buscarBloqueios: jest.fn(async () => []),
  };

  const notificacao = { notificarNovoAgendamento: jest.fn(async () => undefined) };
  const lgpd = { registrar: jest.fn(async (..._args: any[]) => undefined) };

  const service = new PublicoService(
    prisma as any,
    agendamentos as any,
    notificacao as any,
    lgpd as any,
  );

  return { service, prisma, agendamentos, notificacao, lgpd, usuarios, salvos };
}

const PEDIDO = {
  nome: 'João da Silva',
  telefone: '(11) 98888-7777',
  profissionalId: 10,
  servicos: [19],
  data: '2026-08-15T18:00:00Z',
  aceitouTermos: true,
};

describe('a barbearia vem do endereço, nunca do corpo', () => {
  it('marcar em /marcao grava no tenant do Marcão', async () => {
    const { service, salvos } = montar();
    await service.agendar('marcao', PEDIDO);
    expect(salvos[0].tenantId).toBe(1);
  });

  it('mandar outro tenantId no JSON não muda nada', async () => {
    // Este é o ataque óbvio: marcar na agenda de outra barbearia mexendo no
    // corpo da requisição.
    const { service, salvos } = montar();
    await service.agendar('marcao', { ...PEDIDO, tenantId: 2, tenant: 2 });
    expect(salvos[0].tenantId).toBe(1);
  });

  it('endereço que não existe é 404, não uma barbearia qualquer', async () => {
    const { service } = montar();
    await expect(service.agendar('nao-existe', PEDIDO)).rejects.toThrow(/não encontrada/i);
  });
});

describe('a barbearia decide se aceita', () => {
  it('quem exige cadastro recusa, e explica o que fazer', async () => {
    const { service } = montar();
    await expect(service.agendar('latita', PEDIDO)).rejects.toThrow(/cadastro/i);
  });
});

describe('a resposta não vaza dado de ninguém', () => {
  it('devolve o agendamento, e não o cliente', async () => {
    // O repositório entrega o usuário completo. Repassar isso daria e-mail e
    // id de cliente para quem só marcou um corte.
    const { service } = montar();
    const recibo: any = await service.agendar('marcao', PEDIDO);

    expect(recibo.id).toBe(36);
    expect(recibo.usuario).toBeUndefined();
    expect(recibo.usuarioId).toBeUndefined();
    expect(JSON.stringify(recibo)).not.toContain('joao@exemplo.com');
  });

  it('os horários ocupados são só horas, sem nome de quem marcou', async () => {
    const { service } = montar();
    const resposta: any = await service.horariosOcupados('marcao', 10, '2026-08-15');
    expect(Object.keys(resposta)).toEqual(['ocupados']);
  });

  it('profissional de outra barbearia não é consultável pelo endereço errado', async () => {
    const { service } = montar();
    await expect(service.horariosOcupados('latita', 10, '2026-08-15')).rejects.toThrow(
      /não encontrado/i,
    );
  });
});

describe('a conta que nasce daqui', () => {
  it('não serve para entrar em lugar nenhum', async () => {
    const { service, usuarios } = montar();
    await service.agendar('marcao', PEDIDO);

    const criado = usuarios.at(-1)!;
    expect(criado.semCadastro).toBe(true);
    // Senha aleatória de 32 bytes: ninguém a conhece, nem nós.
    expect(criado.senha).toHaveLength(64);
    expect(criado.email).toMatch(/@sem-cadastro\.invalido$/);
  });

  it('registra o aceite dos termos, como manda a LGPD', async () => {
    const { service, lgpd } = montar();
    await service.agendar('marcao', PEDIDO);

    const consentimentos: any[] = lgpd.registrar.mock.calls[0][1];
    expect(consentimentos.map((c: any) => c.tipo)).toEqual(
      expect.arrayContaining(['termos_de_uso', 'politica_privacidade']),
    );
  });

  it('sem aceitar os termos, não agenda', async () => {
    const { service } = montar();
    await expect(
      service.agendar('marcao', { ...PEDIDO, aceitouTermos: false }),
    ).rejects.toThrow(/Termos/i);
  });

  it('lembrete no WhatsApp é opt-in de verdade', async () => {
    const { service, lgpd } = montar();
    await service.agendar('marcao', PEDIDO);
    const consentimentos: any[] = lgpd.registrar.mock.calls[0][1];
    const whats = consentimentos.find((c: any) => c.tipo === 'comunicacoes_whatsapp');
    expect(whats.aceito).toBe(false);
  });
});

describe('quem já é cliente', () => {
  const ANTIGO = {
    id: 500,
    tenantId: 1,
    nome: 'João Pereira',
    telefone: '11988887777',
    ativo: true,
    semCadastro: false,
  };

  it('reaproveita a conta em vez de criar outra', async () => {
    // Sem isto o mesmo cliente vira cinco contas e o histórico dele fica
    // picado — justo o histórico que faz a barbearia lembrar do corte dele.
    const { service, prisma, salvos } = montar({ usuarios: [ANTIGO] });
    await service.agendar('marcao', PEDIDO);

    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(salvos[0].usuarioId).toBe(500);
  });

  it('NÃO renomeia a conta de quem já existe', async () => {
    // Quem soubesse o telefone de alguém poderia renomear a conta da pessoa.
    const { service, usuarios } = montar({ usuarios: [ANTIGO] });
    await service.agendar('marcao', { ...PEDIDO, nome: 'Nome Trocado' });
    expect(usuarios[0].nome).toBe('João Pereira');
  });

  it('e a resposta não conta se o telefone já era cliente', async () => {
    // A resposta trazia um `novaConta`, e ele era exatamente o bit que o
    // cabeçalho deste serviço promete não entregar: digitando telefones dava
    // para descobrir quem se corta ali. Custava um agendamento por consulta,
    // mas era o dado.
    const conhecido: any = await montar({ usuarios: [ANTIGO] }).service.agendar('marcao', PEDIDO);
    const novo: any = await montar().service.agendar('marcao', PEDIDO);

    expect(conhecido.novaConta).toBeUndefined();
    expect(novo.novaConta).toBeUndefined();
    expect(Object.keys(conhecido).sort()).toEqual(Object.keys(novo).sort());
  });

  it('acha a conta mesmo com o telefone gravado com DDI', async () => {
    // A base tem os dois formatos. Sem isto, quem estava como
    // `5511964891128` virava conta nova e não achava o próprio agendamento
    // ao entrar na conta de verdade.
    const comDdi = { ...ANTIGO, telefone: '5511988887777' };
    const { service, prisma, salvos } = montar({ usuarios: [comDdi] });

    await service.agendar('marcao', PEDIDO);

    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(salvos[0].usuarioId).toBe(500);
  });
});

describe('telefone', () => {
  it('aceita como a pessoa digita e guarda só dígitos', async () => {
    const { service, usuarios } = montar();
    await service.agendar('marcao', { ...PEDIDO, telefone: '(11) 98888-7777' });
    expect(usuarios.at(-1)!.telefone).toBe('11988887777');
  });

  it('tira o +55 sem comer o DDD', async () => {
    const { service, usuarios } = montar();
    await service.agendar('marcao', { ...PEDIDO, telefone: '+55 11 98888-7777' });
    expect(usuarios.at(-1)!.telefone).toBe('11988887777');
  });

  it('recusa telefone que não existe', async () => {
    const { service } = montar();
    await expect(service.agendar('marcao', { ...PEDIDO, telefone: '999' })).rejects.toThrow(
      /WhatsApp válido/i,
    );
  });

  it('recusa nome vazio', async () => {
    const { service } = montar();
    await expect(service.agendar('marcao', { ...PEDIDO, nome: ' ' })).rejects.toThrow(/nome/i);
  });
});

describe('o cliente é avisado', () => {
  it('a confirmação sai, e falha dela não derruba o agendamento', async () => {
    const { service, notificacao } = montar();
    notificacao.notificarNovoAgendamento.mockRejectedValueOnce(new Error('Evolution fora'));

    const recibo: any = await service.agendar('marcao', PEDIDO);
    expect(recibo.id).toBe(36);
    expect(notificacao.notificarNovoAgendamento).toHaveBeenCalledWith(36);
  });
});
