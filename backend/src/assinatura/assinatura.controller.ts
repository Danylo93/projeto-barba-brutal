import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AssinaturaService } from './assinatura.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/** Dono só mexe na própria assinatura; admin do SaaS pode tudo. */
function exigirProprioTenantOuAdmin(user: any, tenantId: number) {
  if (user.tipo === 'admin') return;
  if (user.tipo === 'tenant' && user.id === tenantId) return;
  throw new ForbiddenException('Acesso negado à assinatura de outro tenant');
}

/** Endpoints "me" só fazem sentido para a conta do dono (tenant). */
function exigirTenant(user: any): number {
  if (user.tipo !== 'tenant') {
    throw new ForbiddenException('Apenas a conta da barbearia pode gerenciar a própria assinatura');
  }
  return user.id;
}

@Controller('assinaturas')
export class AssinaturaController {
  constructor(private readonly assinaturaService: AssinaturaService) {}

  // ── Endpoints "me": o tenant autenticado gerencia o próprio plano ──

  @Post('me/change-plan')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  changeMyPlan(@CurrentUser() user: any, @Body() data: { planoId: number }) {
    return this.assinaturaService.changePlan(exigirTenant(user), data.planoId);
  }

  @Post('me/cancel')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  cancelMySubscription(@CurrentUser() user: any) {
    return this.assinaturaService.cancelSubscription(exigirTenant(user));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  getMySubscription(@CurrentUser() user: any) {
    return this.assinaturaService.getSubscription(exigirTenant(user));
  }

  // ── Pagamento via Pix (Mercado Pago) ──

  /**
   * Começa a assinatura recorrente e devolve o link do checkout do Mercado
   * Pago, onde o barbeiro escolhe cartão ou Pix.
   */
  @Post('me/recorrente')
  @UseGuards(JwtAuthGuard)
  iniciarRecorrente(@CurrentUser() user: any, @Body() body: { planoId: number }) {
    const tenantId = exigirTenant(user);
    return this.assinaturaService.iniciarAssinaturaRecorrente(tenantId, body?.planoId);
  }

  /** Admin do SaaS: publica/atualiza os planos no Mercado Pago. */
  @Post('planos/sincronizar')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  sincronizarPlanos() {
    return this.assinaturaService.sincronizarTodosOsPlanos();
  }

  @Post('me/pix')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  criarPix(@CurrentUser() user: any, @Body() data: { planoId?: number }) {
    return this.assinaturaService.criarPagamentoPix(exigirTenant(user), data?.planoId);
  }

  @Get('me/pix/:id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  consultarPix(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.assinaturaService.consultarPagamento(exigirTenant(user), id);
  }

  // ── Controle do admin do SaaS sobre pagamentos ──

  @Get('pagamentos')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  listarPagamentos() {
    return this.assinaturaService.listarPagamentos();
  }

  @Post('pagamentos/:id/confirmar')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  confirmarPagamento(@Param('id', ParseIntPipe) id: number) {
    return this.assinaturaService.confirmarPagamentoManual(id);
  }

  // Webhook do Mercado Pago (público — validado pelo id do pagamento).
  // O Mercado Pago manda o tópico ora no corpo, ora na query — o serviço lê
  // os dois para não perder notificação por causa do formato.
  @Post('webhook/mercadopago')
  handleMercadoPago(@Body() body: any, @Query() query: any) {
    return this.assinaturaService.handleWebhookMercadoPago(body, query);
  }

  // ── Endpoints por tenantId: restritos ao próprio tenant ou admin ──

  @Post(':tenantId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelSubscription(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @CurrentUser() user: any,
  ) {
    exigirProprioTenantOuAdmin(user, tenantId);
    return this.assinaturaService.cancelSubscription(tenantId);
  }

  @Get(':tenantId')
  @UseGuards(JwtAuthGuard)
  getSubscription(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @CurrentUser() user: any,
  ) {
    exigirProprioTenantOuAdmin(user, tenantId);
    return this.assinaturaService.getSubscription(tenantId);
  }
}
