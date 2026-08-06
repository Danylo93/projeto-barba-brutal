import { ServiceUnavailableException } from '@nestjs/common';
import { LembreteService } from './lembrete.service';

/**
 * O que este arquivo protege são as falhas que o fluxo antigo tinha e ninguém
 * via: mensagem que não saiu e mesmo assim era dada como enviada, cliente sem
 * telefone sumindo da contabilidade, e vazamento entre barbearias.
 */

const AGORA = new Date('2026-08-04T12:00:00.000Z');

function agendamento(over: any = {}) {
  return {
    id: 1,
    tenantId: 7,
    data: new Date('2026-08-04T13:00:00.000Z'),
    createdAt: new Date('2026-08-04T10:00:00.000Z'),
    status: 'agendado',
    usuario: { nome: 'João', telefone: '11964891128' },
    profissional: { nome: 'Marcão', usuario: { telefone: '11915036789' } },
    servicos: [{ nome: 'Corte', qtdeSlots: 1 }],
    tenant: { nome: 'Barbearia do Marcão', ativo: true },
    ...over,
  };
}

function montarServico(opcoes: { lista?: any[]; envioOk?: (n: string) => boolean } = {}) {
  const consultas: any[] = [];
  const marcacoes: any[] = [];
  const enviadas: { numero: string; texto: string }[] = [];

  const prisma = {
    agendamento: {
      findMany: jest.fn(async (args: any) => {
        consultas.push(args);
        return opcoes.lista ?? [agendamento()];
      }),
      updateMany: jest.fn(async (args: any) => {
        marcacoes.push(args);
        return { count: args.where.id.in.length };
      }),
    },
  };

  const whatsapp = {
    configurado: true,
    enviarTexto: jest.fn(async (numero: string, texto: string) => {
      const ok = opcoes.envioOk ? opcoes.envioOk(numero) : true;
      if (ok) enviadas.push({ numero, texto });
      return ok;
    }),
  };

  const service = new LembreteService(prisma as any, whatsapp as any);
  return { service, prisma, whatsapp, consultas, marcacoes, enviadas };
}

beforeAll(() => jest.useFakeTimers().setSystemTime(AGORA));
afterAll(() => jest.useRealTimers());

describe('consulta dos pendentes', () => {
  // Um único token dava a agenda e o telefone dos clientes do sistema inteiro.
  it('recorta na barbearia quando o tenant vem', async () => {
    const { service, consultas } = montarServico();
    await service.proximos(60, 5, 7);
    expect(consultas[0].where.tenantId).toBe(7);
  });

  it('não manda mensagem em nome de barbearia desativada', async () => {
    const { service, consultas } = montarServico();
    await service.proximos(60, 5);
    expect(consultas[0].where.tenant).toEqual({ ativo: true });
  });

  it('só pega o que ainda não foi lembrado — é o que recupera janela perdida', async () => {
    const { service, consultas } = montarServico();
    await service.proximos(60, 5);
    expect(consultas[0].where.lembreteEnviadoEm).toBeNull();
  });

  // Confirmar depois do horário passar é pior do que não confirmar.
  it('confirmação só olha agendamento que ainda não aconteceu', async () => {
    const { service, consultas } = montarServico();
    await service.confirmacoesPendentes();
    expect(consultas[0].where.confirmacaoEnviadaEm).toBeNull();
    expect(consultas[0].where.data.gt.getTime()).toBe(AGORA.getTime());
    expect(consultas[0].where.createdAt.gte.getTime()).toBe(
      AGORA.getTime() - 6 * 3_600_000,
    );
  });
});

describe('montagem das mensagens', () => {
  it('monta uma para o cliente e uma para o barbeiro', async () => {
    const { service } = montarServico();
    const { envios, total } = await service.proximos(60, 5);
    expect(envios.map((e) => e.para)).toEqual(['cliente', 'barbeiro']);
    // Duas mensagens, um agendamento — o total conta agendamento.
    expect(total).toBe(1);
    expect(envios[0].mensagem).toContain('João');
    expect(envios[0].mensagem).toContain('Barbearia do Marcão');
    expect(envios[0].mensagem).toContain('Corte');
  });

  // O texto antigo dizia "Hoje às 20:00" — para um lembrete que podia sair
  // atrasado, depois de uma falha de envio.
  it('o lembrete traz a data, não a palavra "hoje"', async () => {
    const { service } = montarServico();
    const { envios } = await service.proximos(60, 5);
    expect(envios[0].mensagem).toContain('04/08/2026');
    expect(envios[0].mensagem.toLowerCase()).not.toContain('hoje');
  });

  it('sem telefone do barbeiro, o cliente ainda é avisado', async () => {
    const { service } = montarServico({
      lista: [agendamento({ profissional: { nome: 'Marcão', usuario: null } })],
    });
    const { envios } = await service.proximos(60, 5);
    expect(envios).toHaveLength(1);
    expect(envios[0].para).toBe('cliente');
  });

  // Antes entrava na lista e falhava lá na ponta, calado.
  it('cliente sem telefone sai da fila e vira relatório', async () => {
    const { service } = montarServico({
      lista: [agendamento({ usuario: { nome: 'João', telefone: '' } })],
    });
    const { envios, total, semTelefone } = await service.proximos(60, 5);
    expect(envios).toHaveLength(0);
    expect(total).toBe(0);
    expect(semTelefone).toEqual([{ id: 1, tenantId: 7, cliente: 'João' }]);
  });
});

describe('disparo', () => {
  it('envia e marca o agendamento', async () => {
    const { service, enviadas, marcacoes } = montarServico();
    const r = await service.disparar('lembrete');

    expect(enviadas).toHaveLength(2);
    expect(r.enviados).toBe(2);
    expect(r.falhas).toBe(0);
    expect(r.marcados).toBe(1);
    expect(r.pendentes).toBe(0);
    expect(marcacoes[0].data.lembreteEnviadoEm).toBeInstanceOf(Date);
    expect(marcacoes[0].where.lembreteEnviadoEm).toBeNull();
  });

  it('a confirmação marca o campo dela, não o do lembrete', async () => {
    const { service, marcacoes } = montarServico();
    await service.disparar('confirmacao');
    expect(marcacoes[0].data).toHaveProperty('confirmacaoEnviadaEm');
    expect(marcacoes[0].data).not.toHaveProperty('lembreteEnviadoEm');
  });

  // O coração da correção: o marcador do Redis avançava antes do envio, então
  // Evolution fora do ar significava cliente nunca avisado, para sempre.
  it('Evolution recusando não marca nada — volta na próxima rodada', async () => {
    const { service, marcacoes } = montarServico({ envioOk: () => false });
    const r = await service.disparar('lembrete');

    expect(r.enviados).toBe(0);
    // Uma só: falhando a do cliente, a do barbeiro nem é tentada.
    expect(r.falhas).toBe(1);
    expect(r.marcados).toBe(0);
    expect(r.pendentes).toBe(1);
    expect(marcacoes).toHaveLength(0);
  });

  // Se só a do barbeiro falha, o cliente foi avisado: a tarefa está feita.
  it('marca quando o cliente recebeu, mesmo se a do barbeiro falhar', async () => {
    const { service } = montarServico({
      envioOk: (n) => n === '11964891128',
    });
    const r = await service.disparar('lembrete');
    expect(r.enviados).toBe(1);
    expect(r.falhas).toBe(1);
    expect(r.marcados).toBe(1);
  });

  // O contrário: falhou para o cliente, não está feita.
  it('não marca quando só o barbeiro recebeu', async () => {
    const { service } = montarServico({
      envioOk: (n) => n === '11915036789',
    });
    const r = await service.disparar('lembrete');
    expect(r.marcados).toBe(0);
    expect(r.pendentes).toBe(1);
  });

  // Marcar sem Evolution configurada tiraria o agendamento da fila sem
  // ninguém ter sido avisado — a mentira mais cara que este código poderia
  // contar.
  it('sem Evolution configurada, recusa em vez de marcar', async () => {
    const { service, whatsapp, marcacoes } = montarServico();
    (whatsapp as any).configurado = false;
    await expect(service.disparar('lembrete')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(marcacoes).toHaveLength(0);
  });

  it('corta por agendamento, não por mensagem', async () => {
    const lista = [1, 2, 3].map((id) => agendamento({ id }));
    const { service, enviadas } = montarServico({ lista });
    const r = await service.disparar('lembrete', { limite: 2 });

    // 2 agendamentos inteiros = 4 mensagens; o terceiro fica para depois.
    expect(enviadas).toHaveLength(4);
    expect(r.marcados).toBe(2);
    expect(r.pendentes).toBe(1);
  });
});

/**
 * Banco de mentira com estado: respeita a marca e o filtro por ela, para dar
 * para rodar várias rodadas seguidas como o n8n roda.
 */
function bancoComEstado(linhas: any[]) {
  return {
    agendamento: {
      findMany: jest.fn(async (args: any) =>
        linhas.filter((l) =>
          'confirmacaoEnviadaEm' in args.where
            ? l.confirmacaoEnviadaEm == null
            : l.lembreteEnviadoEm == null,
        ),
      ),
      updateMany: jest.fn(async (args: any) => {
        const campo = Object.keys(args.data)[0];
        let count = 0;
        for (const l of linhas) {
          if (args.where.id.in.includes(l.id) && l[campo] == null) {
            l[campo] = args.data[campo];
            count++;
          }
        }
        return { count };
      }),
    },
  };
}

describe('rodadas seguidas', () => {
  // Achado na revisão: o número do cliente existe mas não é WhatsApp, então a
  // Evolution recusa sempre. Como o agendamento nunca era marcado, o BARBEIRO
  // recebia o mesmo aviso a cada rodada — de minuto em minuto, para sempre.
  it('cliente recusado não vira spam no barbeiro', async () => {
    const linhas = [
      {
        ...agendamento(),
        lembreteEnviadoEm: null,
        confirmacaoEnviadaEm: null,
      },
    ];
    const recebidas: string[] = [];
    const whatsapp = {
      configurado: true,
      enviarTexto: jest.fn(async (numero: string) => {
        if (numero === '11964891128') return false; // cliente recusado
        recebidas.push(numero);
        return true;
      }),
    };
    const service = new LembreteService(
      bancoComEstado(linhas) as any,
      whatsapp as any,
    );

    for (let i = 0; i < 10; i++) await service.disparar('confirmacao');

    expect(recebidas).toHaveLength(0);
  });

  // A confirmação roda a cada 1 minuto e o disparo pode demorar mais que isso.
  it('duas execuções sobrepostas não mandam duas mensagens', async () => {
    const linhas = [
      {
        ...agendamento(),
        lembreteEnviadoEm: null,
        confirmacaoEnviadaEm: null,
      },
    ];
    const recebidas: string[] = [];
    const whatsapp = {
      configurado: true,
      enviarTexto: jest.fn(async (numero: string) => {
        recebidas.push(numero);
        await Promise.resolve(); // cede o event loop, como uma chamada HTTP
        return true;
      }),
    };
    const service = new LembreteService(
      bancoComEstado(linhas) as any,
      whatsapp as any,
    );

    const [a, b] = await Promise.all([
      service.disparar('confirmacao'),
      service.disparar('confirmacao'),
    ]);

    expect(recebidas.filter((n) => n === '11964891128')).toHaveLength(1);
    expect([a.ignorado, b.ignorado].filter(Boolean)).toHaveLength(1);
  });

  it('depois de enviado, a rodada seguinte não repete', async () => {
    const linhas = [
      {
        ...agendamento(),
        lembreteEnviadoEm: null,
        confirmacaoEnviadaEm: null,
      },
    ];
    const recebidas: string[] = [];
    const whatsapp = {
      configurado: true,
      enviarTexto: jest.fn(async (numero: string) => {
        recebidas.push(numero);
        return true;
      }),
    };
    const service = new LembreteService(
      bancoComEstado(linhas) as any,
      whatsapp as any,
    );

    await service.disparar('lembrete');
    await service.disparar('lembrete');

    // Cliente e barbeiro, uma vez cada — e só.
    expect(recebidas).toEqual(['11964891128', '11915036789']);
  });
});

describe('marcação avulsa', () => {
  it('ignora id que não é número positivo', async () => {
    const { service, marcacoes } = montarServico();
    const r = await service.marcar('lembrete', [0, -3, NaN as any, 'x' as any]);
    expect(r.marcados).toBe(0);
    expect(marcacoes).toHaveLength(0);
  });

  it('não deixa uma barbearia marcar agendamento de outra', async () => {
    const { service, marcacoes } = montarServico();
    await service.marcar('lembrete', [1, 2], 7);
    expect(marcacoes[0].where.tenantId).toBe(7);
  });
});

describe('de qual número sai a mensagem', () => {
  // O sistema passou a ter uma instância da Evolution por barbearia. Sem
  // carregar isso no envio, o cliente da Latita receberia o lembrete pelo
  // WhatsApp de outra barbearia — e responderia para o número errado.
  it('usa a instância da barbearia', async () => {
    const { service } = montarServico({
      lista: [
        agendamento({
          tenant: {
            nome: 'Barbearia do Marcão',
            ativo: true,
            configuracoes: { evolutionInstance: 'marcao' },
          },
        }),
      ],
    });
    const { envios } = await service.proximos(60, 5);
    expect(envios.every((e) => e.instancia === 'marcao')).toBe(true);
  });

  it('sem instância própria, deixa o envio cair no padrão do ambiente', async () => {
    const { service } = montarServico();
    const { envios } = await service.proximos(60, 5);
    expect(envios.every((e) => e.instancia === null)).toBe(true);
  });

  it('a instância chega em quem envia', async () => {
    const usadas: (string | null | undefined)[] = [];
    const { service, whatsapp } = montarServico({
      lista: [
        agendamento({
          tenant: {
            nome: 'Latita',
            ativo: true,
            configuracoes: { evolutionInstance: 'latita' },
          },
        }),
      ],
    });
    (whatsapp as any).enviarTexto = jest.fn(
      async (_n: string, _t: string, instancia?: string | null) => {
        usadas.push(instancia);
        return true;
      },
    );
    await service.disparar('lembrete');
    expect(usadas).toEqual(['latita', 'latita']);
  });
});
