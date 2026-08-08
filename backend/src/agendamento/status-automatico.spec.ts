import {
  encerrarHorariosUltrapassados,
  horarioJaTerminou,
} from './status-automatico';

const AGORA = new Date('2026-08-07T14:00:00.000Z');

describe('status automático do agendamento', () => {
  it('mantém ativo enquanto o serviço ainda está acontecendo', () => {
    expect(
      horarioJaTerminou(
        {
          id: 1,
          data: new Date('2026-08-07T13:30:00.000Z'),
          servicos: [{ qtdeSlots: 2 }],
        },
        AGORA,
      ),
    ).toBe(false);
  });

  it('encerra somente depois da duração completa dos serviços', () => {
    expect(
      horarioJaTerminou(
        {
          id: 1,
          data: new Date('2026-08-07T13:00:00.000Z'),
          servicos: [{ qtdeSlots: 1 }, { qtdeSlots: 1 }],
        },
        AGORA,
      ),
    ).toBe(true);
  });

  it('grava expirado apenas nos horários realmente encerrados', async () => {
    const prisma = {
      agendamento: {
        findMany: jest.fn(async () => [
          {
            id: 10,
            data: new Date('2026-08-07T12:00:00.000Z'),
            servicos: [{ qtdeSlots: 1 }],
          },
          {
            id: 11,
            data: new Date('2026-08-07T13:45:00.000Z'),
            servicos: [{ qtdeSlots: 2 }],
          },
        ]),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };

    await expect(
      encerrarHorariosUltrapassados(prisma, { tenantId: 7 }, AGORA),
    ).resolves.toBe(1);
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 7,
          status: { in: ['agendado', 'confirmado'] },
        }),
      }),
    );
    expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [10] },
        status: { in: ['agendado', 'confirmado'] },
      },
      data: { status: 'expirado' },
    });
  });

  it('não escreve nada quando nenhum horário terminou', async () => {
    const prisma = {
      agendamento: {
        findMany: jest.fn(async () => []),
        updateMany: jest.fn(),
      },
    };
    await expect(encerrarHorariosUltrapassados(prisma, {}, AGORA)).resolves.toBe(0);
    expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
  });
});
