import { Agendamento, ObterHorariosOcupados, Usuario } from '../types';
import { AgendamentoRepository } from './agendamento.repository';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsuarioLogado } from '../usuario/usuario.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { LimitsGuard } from '../auth/limits.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { FeatureGuard } from '../auth/feature.guard';
import { RequiresFeature } from '../auth/feature.decorator';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { normalizarStatus, STATUS_INVALIDO } from './status';


@Controller('agendamentos')
@RequiresFeature('agendamentos')
@UseGuards(JwtAuthGuard, SubscriptionGuard, LimitsGuard, FeatureGuard)
export class AgendamentoController {
  private readonly logger = new Logger(AgendamentoController.name);

  constructor(
    private readonly repo: AgendamentoRepository,
    private readonly notificacao: NotificacaoService,
  ) {}

  @Post()
  async criar(
    @Body() body: any, // Agendamento + telefoneCliente
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    let agendamento = body as Agendamento;
    // Se o bot mandou o telefoneCliente e for admin/barbeiro/bot
    if (body.telefoneCliente && (usuarioLogado.tipo === 'tenant' || usuarioLogado.barbeiro)) {
      const usuarioId = await this.repo.buscarIdUsuarioPorTelefone(body.telefoneCliente, tenant.id);
      if (usuarioId) {
        agendamento.usuarioId = usuarioId;
      } else {
        throw new HttpException('Usuário não encontrado pelo telefone', 404);
      }
    } else {
      // Permite que o próprio usuário crie, ou que o tenant admin/barbeiro crie em nome dele
      if (agendamento.usuarioId !== usuarioLogado.id && usuarioLogado.tipo !== 'tenant' && !usuarioLogado.barbeiro) {
        throw new HttpException('Usuário não autorizado', 401);
      }
    }
    agendamento.tenantId = tenant.id;
    const id = await this.repo.salvar(agendamento);
    // Notificação assíncrona (não bloqueia a resposta e nunca derruba o fluxo).
    this.notificacao.notificarNovoAgendamento(id).catch((erro) => {
      // O agendamento está criado; o aviso é o que falhou. Fica no log para
      // dar para descobrir por que o cliente não recebeu a confirmação.
      this.logger.error(
        `Falha ao avisar o cliente do agendamento ${id}: ${erro?.message ?? erro}`,
      );
    });
    // Devolve o agendamento criado para o cliente saber o id (remarcar, cancelar…).
    return this.repo.buscarPorId(id, tenant.id);
  }

  @Get('barbeiro/meus-horarios')
  async buscarMeusHorariosBarbeiro(
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    if (!usuarioLogado.barbeiro) {
      throw new HttpException('Usuário não autorizado', 401);
    }
    return this.repo.buscarPorUsuarioProfissional(usuarioLogado.id, tenant.id);
  }

  @Get(':email')
  buscarPorEmail(@Param('email') email: string, @CurrentTenant() tenant: any) {
    return this.repo.buscarPorEmail(email, tenant.id);
  }

  @Get('telefone/:telefone')
  buscarPorTelefone(@Param('telefone') telefone: string, @CurrentTenant() tenant: any) {
    return this.repo.buscarPorTelefone(telefone, tenant.id);
  }

  @Get('ocupacao/:profissional/:data')
  async buscarOcupacaoPorProfissionalEData(
    @Param('profissional') profissional: string,
    @Param('data') dataParam: string,
    @CurrentTenant() tenant: any,
  ) {
    const casoDeUso = new ObterHorariosOcupados(this.repo);
    // A data vai como veio: `new Date('2026-08-07')` é meia-noite em UTC, que
    // aqui ainda é o dia 06 às 21h. Quem lê a data é o repositório, no fuso
    // de Brasília.
    return casoDeUso.executar(+profissional, dataParam, tenant.id);
  }

  @Get(':profissional/:data')
  buscarPorProfissionalEData(
    @Param('profissional') profissional: string,
    @Param('data') dataParam: string,
    @CurrentTenant() tenant: any,
  ) {
    return this.repo.buscarPorProfissionalEData(
      +profissional,
      dataParam,
      tenant.id,
    );
  }

  @Delete(':id')
  async excluir(
    @Param('id') id: string,
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    const agendamento = await this.repo.buscarPorId(+id, tenant.id);
    if (!agendamento) {
      throw new HttpException('Agendamento não encontrado', 404);
    }
    if (
      !usuarioLogado.barbeiro &&
      usuarioLogado.tipo !== 'tenant' &&
      usuarioLogado.id !== agendamento.usuarioId
    ) {
      throw new HttpException('Usuário não autorizado', 401);
    }
    if (agendamento.status === 'cancelado') {
      return { id: agendamento.id, status: 'cancelado', jaEstava: true };
    }
    if (agendamento.status === 'concluido' || agendamento.status === 'expirado') {
      throw new HttpException(
        agendamento.status === 'expirado'
          ? 'Não é possível cancelar um horário que já terminou'
          : 'Não é possível cancelar um agendamento já concluído',
        400,
      );
    }
    // DELETE é mantido para não quebrar os clientes existentes, mas o efeito
    // de negócio é cancelamento. Apagar a linha destruía o histórico que a
    // própria tela usa para explicar o que aconteceu com aquele horário.
    await this.repo.atualizarStatus(+id, tenant.id, 'cancelado');
    this.avisarCancelamento(agendamento);
    return { id: agendamento.id, status: 'cancelado' };
  }

  /**
   * O dono viu o Pix cair e libera o horário.
   *
   * É ação manual porque o dinheiro não passa por aqui: o Pix vai direto para
   * a conta da barbearia, e quem enxerga o extrato é ela. Confirmar sozinho
   * exigiria integrar a conta bancária do dono — outra funcionalidade, e
   * outro tipo de responsabilidade.
   */
  @Post(':id/sinal/confirmar')
  async confirmarSinal(
    @Param('id') id: string,
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    this.exigirEquipe(usuarioLogado);
    return this.repo.registrarSinal(+id, tenant.id, 'pago');
  }

  /** Cliente conhecido, freguês antigo: o dono libera sem cobrar. */
  @Post(':id/sinal/dispensar')
  async dispensarSinal(
    @Param('id') id: string,
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    this.exigirEquipe(usuarioLogado);
    return this.repo.registrarSinal(+id, tenant.id, 'dispensado');
  }

  @Patch(':id/status')
  async atualizarStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    if (!usuarioLogado.barbeiro && usuarioLogado.tipo !== 'tenant') {
      throw new HttpException('Usuário não autorizado', 401);
    }
    // Sem isto o texto que chegasse ia direto para o banco: "inventado", ""
    // e "CANCELADO" em maiúscula entravam com 200, e o maiúsculo ainda fazia
    // o atendimento cancelado contar como receita nos relatórios.
    const novoStatus = normalizarStatus(status);
    if (!novoStatus) {
      throw new HttpException(STATUS_INVALIDO, 400);
    }

    const agendamento = await this.repo.buscarPorId(+id, tenant.id);
    if (!agendamento) {
      throw new HttpException('Agendamento não encontrado', 404);
    }
    if (agendamento.status === 'concluido' && novoStatus !== 'concluido') {
      throw new HttpException('Não é possível reverter o status de um agendamento concluído', 400);
    }
    if (novoStatus === 'expirado' && agendamento.status !== 'expirado') {
      throw new HttpException('O status expirado é definido automaticamente pelo sistema', 400);
    }
    if (
      agendamento.status === 'expirado' &&
      novoStatus !== 'expirado' &&
      novoStatus !== 'concluido'
    ) {
      throw new HttpException(
        'Um horário encerrado só pode ser confirmado como concluído',
        400,
      );
    }
    await this.repo.atualizarStatus(+id, tenant.id, novoStatus);

    if (novoStatus === 'cancelado') {
      this.avisarCancelamento(agendamento);
    }
    
    if (novoStatus === 'confirmado' && agendamento.status !== 'confirmado') {
      this.notificacao.notificarConfirmacaoAgendamento(+id).catch((erro) => {
        this.logger.error(
          `Falha ao avisar o cliente da confirmação do agendamento ${id}: ${erro?.message ?? erro}`,
        );
      });
    }

    return { id: agendamento.id, status: novoStatus };
  }

  /** Dono ou barbeiro. Cliente não confirma o próprio pagamento. */
  private exigirEquipe(usuario: Usuario | any) {
    if (usuario?.tipo === 'tenant' || usuario?.barbeiro) return;
    throw new HttpException('Usuário não autorizado', 401);
  }

  /**
   * Aviso de cancelamento em segundo plano.
   *
   * Não pode derrubar a resposta — o cancelamento já aconteceu —, mas também
   * não pode sumir: antes era `.catch(() => undefined)`, então quando o e-mail
   * ou o WhatsApp falhava o cliente não era avisado e não sobrava nem log
   * para descobrir.
   */
  private avisarCancelamento(agendamento: any): void {
    this.notificacao.notificarCancelamentoAgendamento(agendamento).catch((erro) => {
      this.logger.error(
        `Falha ao avisar o cliente do cancelamento do agendamento ${agendamento?.id}: ${erro?.message ?? erro}`,
      );
    });
  }

  @Patch(':id/reagendar')
  async reagendar(
    @Param('id') id: string,
    @Body('data') data: string,
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    const agendamento = await this.repo.buscarPorId(+id, tenant.id);
    if (!agendamento) {
      throw new HttpException('Agendamento não encontrado', 404);
    }
    // Para simplificar a verificação, permitimos que tanto o barbeiro/tenant
    // quanto o próprio usuário (bot via token ou frontend) possam reagendar.
    if (!usuarioLogado.barbeiro && usuarioLogado.tipo !== 'tenant' && usuarioLogado.id !== agendamento.usuarioId) {
      throw new HttpException('Usuário não autorizado', 401);
    }
    if (
      agendamento.status === 'concluido' ||
      agendamento.status === 'cancelado' ||
      agendamento.status === 'expirado'
    ) {
      throw new HttpException(
        'Não é possível reagendar um agendamento concluído, cancelado ou encerrado',
        400,
      );
    }
    await this.repo.reagendar(+id, tenant.id, new Date(data));
  }
}
