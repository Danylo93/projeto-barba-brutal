import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClubeService, DadosPlanoClube } from './clube.service';

/**
 * Clube de assinatura da barbearia.
 * - Dono: cria planos, define a chave Pix e confirma pagamentos.
 * - Cliente: vê os planos ativos, assina (recebe o Pix) e cancela o próprio.
 */
@Controller('clube')
@UseGuards(JwtAuthGuard)
export class ClubeController {
  constructor(private readonly service: ClubeService) {}

  private ehDono(user: any) {
    return user?.tipo === 'tenant';
  }

  private tenantIdDe(user: any): number {
    return this.ehDono(user) ? user.id : user.tenantId;
  }

  private exigirDono(user: any) {
    if (!this.ehDono(user)) {
      throw new ForbiddenException('Apenas o dono da barbearia pode fazer isso.');
    }
  }

  /* ------------------------------ planos ------------------------------ */

  /** Cliente vê só os ativos; o dono vê todos (para gerenciar). */
  @Get('planos')
  listarPlanos(@CurrentUser() user: any) {
    return this.service.listarPlanos(this.tenantIdDe(user), !this.ehDono(user));
  }

  @Post('planos')
  criarPlano(@CurrentUser() user: any, @Body() dados: DadosPlanoClube) {
    this.exigirDono(user);
    return this.service.criarPlano(user.id, dados);
  }

  @Put('planos/:id')
  atualizarPlano(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dados: DadosPlanoClube,
  ) {
    this.exigirDono(user);
    return this.service.atualizarPlano(user.id, id, dados);
  }

  @Delete('planos/:id')
  removerPlano(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    this.exigirDono(user);
    return this.service.removerPlano(user.id, id);
  }

  /* ----------------------------- chave Pix ---------------------------- */

  @Put('chave-pix')
  definirChavePix(@CurrentUser() user: any, @Body() body: { chavePix: string }) {
    this.exigirDono(user);
    return this.service.definirChavePix(user.id, body?.chavePix);
  }

  /* ---------------------------- assinaturas --------------------------- */

  @Get('resumo')
  resumo(@CurrentUser() user: any) {
    this.exigirDono(user);
    return this.service.resumo(user.id);
  }

  @Get('assinaturas')
  listarAssinaturas(@CurrentUser() user: any, @Query('status') status?: string) {
    this.exigirDono(user);
    return this.service.listarAssinaturas(user.id, status);
  }

  @Get('minhas-assinaturas')
  minhasAssinaturas(@CurrentUser() user: any) {
    if (this.ehDono(user)) return [];
    return this.service.listarMinhasAssinaturas(user.id, user.tenantId);
  }

  @Post('assinar/:planoId')
  assinar(@CurrentUser() user: any, @Param('planoId', ParseIntPipe) planoId: number) {
    if (this.ehDono(user)) {
      throw new ForbiddenException('O clube é para os clientes da barbearia.');
    }
    return this.service.assinar(user.tenantId, user.id, planoId);
  }

  @Post('assinaturas/:id/confirmar')
  confirmar(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    this.exigirDono(user);
    return this.service.confirmarPagamento(user.id, id);
  }

  @Post('assinaturas/:id/cancelar')
  cancelar(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    // Dono cancela qualquer uma; cliente só a própria.
    return this.ehDono(user)
      ? this.service.cancelar(user.id, id)
      : this.service.cancelar(user.tenantId, id, user.id);
  }
}
