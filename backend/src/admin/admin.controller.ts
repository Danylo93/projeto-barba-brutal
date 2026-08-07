import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { TenantService } from '../tenant/tenant.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly tenantService: TenantService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('tenants')
  getAllTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getAllTenants(pageNum, limitNum, search);
  }

  @Get('tenants/:id')
  getTenantById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTenantById(id);
  }

  @Put('tenants/:id/status')
  updateTenantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { ativo: boolean },
  ) {
    return this.adminService.updateTenantStatus(id, data.ativo);
  }

  /**
   * A instance da Evolution de uma barbearia.
   *
   * Fica aqui, e não no painel do dono, porque quem cria a instance no
   * servidor da Evolution é o admin do SaaS. O dono não teria como inventar
   * um nome que existisse — só conseguiria digitar um que não conecta nunca,
   * ou o de outra barbearia.
   */
  @Put('tenants/:id/whatsapp')
  definirInstance(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { instance?: string },
  ) {
    return this.tenantService.definirInstanceDaEvolution(id, data?.instance ?? '');
  }

  /** O número dessa instance está online? Para o admin conferir na hora. */
  @Get('tenants/:id/whatsapp')
  async conexaoDaBarbearia(@Param('id', ParseIntPipe) id: number) {
    const tenant = await this.tenantService.findById(id);
    const instance = String(((tenant?.configuracoes as any) ?? {}).evolutionInstance ?? '').trim();
    return this.whatsapp.obterConexao(instance);
  }

  @Get('revenue')
  getRevenueByMonth(@Query('months') months?: string) {
    const monthsNum = months ? parseInt(months, 10) : 12;
    return this.adminService.getRevenueByMonth(monthsNum);
  }

  @Get('top-tenants')
  getTopTenants(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTopTenants(limitNum);
  }
}
