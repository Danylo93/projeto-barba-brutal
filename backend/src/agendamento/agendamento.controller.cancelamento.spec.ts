import { HttpException } from '@nestjs/common';
import { AgendamentoController } from './agendamento.controller';

describe('cancelamento pela rota antiga de exclusão', () => {
  const repo = {
    buscarPorId: jest.fn(),
    atualizarStatus: jest.fn(async () => undefined),
    excluir: jest.fn(async () => undefined),
  };
  const notificacao = {
    notificarCancelamentoAgendamento: jest.fn(async () => undefined),
  };
  const controller = new AgendamentoController(repo as any, notificacao as any);
  const usuario = { id: 12, barbeiro: false } as any;
  const tenant = { id: 7 };

  beforeEach(() => jest.clearAllMocks());

  it('preserva o registro e troca apenas o status', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, usuarioId: 12, status: 'agendado' });

    await expect(controller.excluir('30', usuario, tenant)).resolves.toEqual({
      id: 30,
      status: 'cancelado',
    });
    expect(repo.atualizarStatus).toHaveBeenCalledWith(30, 7, 'cancelado');
    expect(repo.excluir).not.toHaveBeenCalled();
  });

  it('permite que o dono cancele o horário de um cliente da barbearia', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, usuarioId: 99, status: 'confirmado' });

    await expect(
      controller.excluir('30', { id: 7, tipo: 'tenant', barbeiro: false } as any, tenant),
    ).resolves.toMatchObject({ status: 'cancelado' });
    expect(repo.atualizarStatus).toHaveBeenCalledWith(30, 7, 'cancelado');
  });

  it('cancelar de novo não repete operação nem notificação', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, usuarioId: 12, status: 'cancelado' });

    await expect(controller.excluir('30', usuario, tenant)).resolves.toMatchObject({
      status: 'cancelado',
      jaEstava: true,
    });
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
    expect(notificacao.notificarCancelamentoAgendamento).not.toHaveBeenCalled();
  });

  it('não cancela atendimento concluído', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, usuarioId: 12, status: 'concluido' });
    await expect(controller.excluir('30', usuario, tenant)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
  });

  it('não cancela horário que já encerrou', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, usuarioId: 12, status: 'expirado' });
    await expect(controller.excluir('30', usuario, tenant)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
  });
});

describe('transição do horário encerrado', () => {
  const repo = {
    buscarPorId: jest.fn(),
    atualizarStatus: jest.fn(async () => undefined),
  };
  const notificacao = {
    notificarCancelamentoAgendamento: jest.fn(async () => undefined),
    notificarConfirmacaoAgendamento: jest.fn(async () => undefined),
  };
  const controller = new AgendamentoController(repo as any, notificacao as any);
  const barbeiro = { id: 12, barbeiro: true } as any;
  const tenant = { id: 7 };

  beforeEach(() => jest.clearAllMocks());

  it('permite confirmar depois que o barbeiro atesta que houve atendimento', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, status: 'expirado' });
    await expect(
      controller.atualizarStatus('30', 'concluido', barbeiro, tenant),
    ).resolves.toMatchObject({ status: 'concluido' });
    expect(repo.atualizarStatus).toHaveBeenCalledWith(30, 7, 'concluido');
  });

  it('não reabre um horário encerrado como agendado ou confirmado', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, status: 'expirado' });
    await expect(
      controller.atualizarStatus('30', 'confirmado', barbeiro, tenant),
    ).rejects.toBeInstanceOf(HttpException);
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
  });

  it('não permite que a API force expirado antes da hora', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 30, status: 'agendado' });
    await expect(
      controller.atualizarStatus('30', 'expirado', barbeiro, tenant),
    ).rejects.toBeInstanceOf(HttpException);
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
  });
});
