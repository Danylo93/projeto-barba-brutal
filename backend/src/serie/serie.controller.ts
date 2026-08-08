import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SerieService } from './serie.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * Atendimento recorrente: "todo sábado às 10h".
 *
 * Quem monta é a barbearia, não o cliente. Deixar o cliente reservar o mesmo
 * horário para sempre, sozinho, é dar a ele o poder de bloquear a agenda de
 * um profissional indefinidamente.
 */
@Controller('series')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class SerieController {
  constructor(private readonly series: SerieService) {}

  @Get()
  listar(@CurrentTenantId() tenantId: number, @CurrentUser() usuario: any) {
    this.exigirEquipe(usuario);
    return this.series.listar(tenantId);
  }

  @Post()
  criar(
    @Body() body: any,
    @CurrentTenantId() tenantId: number,
    @CurrentUser() usuario: any,
  ) {
    this.exigirEquipe(usuario);
    return this.series.criar(tenantId, body);
  }

  /** Estende a série: cria os próximos horários que ainda faltam. */
  @Post(':id/gerar')
  async gerar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
    @CurrentUser() usuario: any,
  ) {
    this.exigirEquipe(usuario);
    await this.exigirDaBarbearia(tenantId, id);
    return this.series.gerarHorarios(id);
  }

  @Delete(':id')
  encerrar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
    @CurrentUser() usuario: any,
  ) {
    this.exigirEquipe(usuario);
    return this.series.encerrar(tenantId, id);
  }

  private exigirEquipe(usuario: any) {
    if (usuario?.tipo === 'tenant' || usuario?.barbeiro) return;
    throw new ForbiddenException('Só a equipe da barbearia monta atendimento recorrente.');
  }

  /**
   * A série tem que ser desta barbearia.
   *
   * `gerarHorarios` recebe só o id — sem esta checagem, mandar o id de uma
   * série de outra barbearia criaria horários na agenda dela.
   */
  private async exigirDaBarbearia(tenantId: number, serieId: number) {
    const serie = await this.series.listar(tenantId);
    if (!serie.some((s) => s.id === serieId)) {
      throw new ForbiddenException('Série não encontrada nesta barbearia.');
    }
  }
}
