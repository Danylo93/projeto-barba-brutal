import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  create(@Body() data: {
    nome: string;
    email: string;
    telefone: string;
    endereco?: string;
    cnpj?: string;
    dominio?: string;
    logo?: string;
    corPrimaria?: string;
    corSecundaria?: string;
  }) {
    return this.tenantService.create(data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  getMe(@CurrentUser() user: any) {
    return this.tenantService.findById(user.id);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  getMyStats(@CurrentUser() user: any) {
    return this.tenantService.getStats(user.id);
  }

  @Put('me/configuracoes')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  updateConfiguracoes(
    @CurrentUser() user: any,
    @Body() configuracoes: any,
  ) {
    return this.tenantService.update(user.id, { configuracoes });
  }

  @Get('me/agendamentos')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  getMyAgendamentos(@CurrentUser() user: any) {
    return this.tenantService.getAgendamentos(user.id);
  }

  /** Landing pública da barbearia (sem autenticação) — por domínio ou id. */
  @Get('publico/:identificador')
  getPaginaPublica(@Param('identificador') identificador: string) {
    return this.tenantService.getPaginaPublica(identificador);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.tenantService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.findById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<{
      nome: string;
      email: string;
      telefone: string;
      endereco: string;
      cnpj: string;
      dominio: string;
      logo: string;
      corPrimaria: string;
      corSecundaria: string;
      ativo: boolean;
    }>
  ) {
    return this.tenantService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.delete(id);
  }

  @Get(':id/limits')
  checkLimits(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.checkLimits(id);
  }
}
