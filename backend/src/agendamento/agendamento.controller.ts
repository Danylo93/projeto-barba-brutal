import { Agendamento, ObterHorariosOcupados, Usuario } from '../types';
import { AgendamentoRepository } from './agendamento.repository';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsuarioLogado } from 'src/usuario/usuario.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { LimitsGuard } from '../auth/limits.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { FeatureGuard } from '../auth/feature.guard';
import { RequiresFeature } from '../auth/feature.decorator';
import { NotificacaoService } from '../notificacao/notificacao.service';


@Controller('agendamentos')
@RequiresFeature('agendamentos')
@UseGuards(JwtAuthGuard, SubscriptionGuard, LimitsGuard, FeatureGuard)
export class AgendamentoController {
  constructor(
    private readonly repo: AgendamentoRepository,
    private readonly notificacao: NotificacaoService,
  ) {}

  @Post()
  async criar(
    @Body() agendamento: Agendamento,
    @UsuarioLogado() usuarioLogado: Usuario,
    @CurrentTenant() tenant: any,
  ) {
    if (agendamento.usuarioId !== usuarioLogado.id) {
      throw new HttpException('Usuário não autorizado', 401);
    }
    agendamento.tenantId = tenant.id;
    const id = await this.repo.salvar(agendamento);
    // Notificação assíncrona (não bloqueia a resposta e nunca derruba o fluxo).
    this.notificacao.notificarNovoAgendamento(id).catch(() => undefined);
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

  @Get('ocupacao/:profissional/:data')
  async buscarOcupacaoPorProfissionalEData(
    @Param('profissional') profissional: string,
    @Param('data') dataParam: string,
    @CurrentTenant() tenant: any,
  ) {
    const casoDeUso = new ObterHorariosOcupados(this.repo);
    return casoDeUso.executar(+profissional, new Date(dataParam));
  }

  @Get(':profissional/:data')
  buscarPorProfissionalEData(
    @Param('profissional') profissional: string,
    @Param('data') dataParam: string,
    @CurrentTenant() tenant: any,
  ) {
    return this.repo.buscarPorProfissionalEData(
      +profissional,
      new Date(dataParam),
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
    if (!usuarioLogado.barbeiro && usuarioLogado.id !== agendamento.usuarioId) {
      throw new HttpException('Usuário não autorizado', 401);
    }
    if (agendamento.status === 'concluido') {
      throw new HttpException('Não é possível excluir um agendamento já concluído', 400);
    }
    await this.repo.excluir(+id, tenant.id);
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
    const agendamento = await this.repo.buscarPorId(+id, tenant.id);
    if (!agendamento) {
      throw new HttpException('Agendamento não encontrado', 404);
    }
    if (agendamento.status === 'concluido' && status !== 'concluido') {
      throw new HttpException('Não é possível reverter o status de um agendamento concluído', 400);
    }
    await this.repo.atualizarStatus(+id, tenant.id, status);
  }
}
