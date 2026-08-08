import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';

/** O dono só mexe na própria barbearia; o admin do SaaS mexe em qualquer uma. */
function exigirProprioTenantOuAdmin(user: any, tenantId: number) {
  if (user?.tipo === 'admin') return;
  if (user?.tipo === 'tenant' && user.id === tenantId) return;
  throw new ForbiddenException('Acesso negado aos dados de outra barbearia');
}

@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly whatsappService: WhatsappService,
  ) {}

  private async evolutionInstanceDoTenant(tenantId: number): Promise<string> {
    const tenant = await this.tenantService.findById(tenantId);
    const configuracoes = (tenant?.configuracoes as any) ?? {};
    return String(configuracoes.evolutionInstance ?? '').trim();
  }

  // Barbearia nova entra por /auth/tenant/register, que exige CPF/CNPJ válido
  // e único. Este endpoint é ferramenta de administração e não pode ficar
  // aberto — sem guarda, qualquer um criava barbearia pulando essa validação.
  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
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

  @Get('me/whatsapp')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async getMeuWhatsapp(@CurrentUser() user: any) {
    const instance = await this.evolutionInstanceDoTenant(user.id);
    return this.whatsappService.obterConexao(instance);
  }

  @Post('me/whatsapp/qrcode')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async getMeuWhatsappQrCode(@CurrentUser() user: any) {
    const instance = await this.evolutionInstanceDoTenant(user.id);
    return this.whatsappService.obterQrCode(instance);
  }

  @Post('me/whatsapp/webhook')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async configurarMeuWhatsappWebhook(@CurrentUser() user: any) {
    const instance = await this.evolutionInstanceDoTenant(user.id);
    return this.whatsappService.configurarWebhook(instance);
  }

  @Put('me/configuracoes')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  updateConfiguracoes(
    @CurrentUser() user: any,
    @Body() body: { configuracoes: any, corSecundaria?: string },
  ) {
    return this.tenantService.update(user.id, body);
  }

  /**
   * Regra do sinal e do agendamento sem cadastro.
   *
   * Fica separado de `me/configuracoes` porque estes campos são colunas, e
   * não JSON solto: eles entram em consulta (a agenda pergunta se o sinal
   * expirou) e em cálculo de dinheiro.
   */
  @Put('me/recebimento')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  atualizarRecebimento(@CurrentUser() user: any, @Body() body: any) {
    return this.tenantService.atualizarRecebimento(user.id, body);
  }

  @Post('me/api-key')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  generateApiKey(@CurrentUser() user: any) {
    return this.tenantService.generateApiKey(user.id);
  }

  /** Relatório de comissões da equipe (?mes=2026-07; padrão: mês atual). */
  @Get('me/comissoes')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  getMinhasComissoes(@CurrentUser() user: any, @Query('mes') mes?: string) {
    return this.tenantService.getComissoes(user.id, mes);
  }

  @Get('me/agendamentos')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  getMyAgendamentos(@CurrentUser() user: any) {
    return this.tenantService.getAgendamentos(user.id);
  }

  /**
   * Verifica se um slug (subdomínio) está disponível para uso.
   * Público, sem autenticação — usado pelo formulário de cadastro.
   */
  @Get('verificar-slug/:slug')
  verificarSlug(@Param('slug') slug: string) {
    return this.tenantService.verificarSlug(slug);
  }

  /**
   * Verifica se um CPF/CNPJ já está cadastrado.
   * Público — usado pelo formulário de cadastro.
   */
  @Get('verificar-documento/:documento')
  verificarDocumento(@Param('documento') documento: string) {
    return this.tenantService.verificarDocumento(documento);
  }

  /**
   * Verifica se um e-mail já está cadastrado como barbearia.
   * Público — usado pelo formulário de cadastro.
   */
  @Get('verificar-email/:email')
  verificarEmail(@Param('email') email: string) {
    return this.tenantService.verificarEmail(email);
  }

  // TODO: Remover após executar em produção
  @Get('fix/set-latita')
  async fixLatita() {
    try {
      return await this.tenantService.fixLatita();
    } catch (e: any) {
      return { error: e.message, code: e.code, stack: e.stack };
    }
  }

  /** Landing pública da barbearia (sem autenticação) — por domínio ou id. */
  @Get('publico/:identificador')
  getPaginaPublica(@Param('identificador') identificador: string) {
    return this.tenantService.getPaginaPublica(identificador);
  }

  // A lista traz TODAS as barbearias do SaaS, com faturamento e contatos.
  // É painel do dono do SaaS, não informação pública.
  @Get()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.tenantService.findAll(pageNum, limitNum);
  }

  /** Dados de uma barbearia: o próprio dono ou o admin do SaaS. */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    exigirProprioTenantOuAdmin(user, id);
    return this.tenantService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    exigirProprioTenantOuAdmin(user, id);
    // Só o admin do SaaS pode mexer em `ativo` (suspender/reativar).
    return this.tenantService.update(id, data, user?.tipo === 'admin');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.delete(id);
  }

  @Get(':id/limits')
  @UseGuards(JwtAuthGuard)
  checkLimits(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    exigirProprioTenantOuAdmin(user, id);
    return this.tenantService.checkLimits(id);
  }
}
