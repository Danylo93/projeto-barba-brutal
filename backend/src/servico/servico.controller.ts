import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AtualizarServicoDto, CriarServicoDto } from './servico.dto';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant, CurrentTenantId } from '../auth/current-tenant.decorator';
import { paraCriar, servicosQueFaltam } from './catalogo-padrao';

@Controller('servicos')
export class ServicoController {
  constructor(private readonly prisma: PrismaService) {}

  // Leitura escopada ao tenant do usuário autenticado (evita vazar serviços de outras barbearias)
  @Get()
  @UseGuards(JwtAuthGuard)
  async buscarTodos(@CurrentTenantId() tenantId: number) {
    return this.prisma.servico.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
  ) {
    return this.prisma.servico.findFirst({
      where: { id, tenantId },
    });
  }

  /**
   * Completa a barbearia com os serviços do catálogo que ela ainda não tem.
   *
   * Existe para as barbearias criadas antes do catálogo padrão, que ficaram
   * com dois ou três serviços. Fica ANTES de `:id` porque o Nest casa as rotas
   * na ordem de declaração.
   */
  @Post('sugeridos')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async adicionarSugeridos(@CurrentTenant() tenant: any) {
    const existentes = await this.prisma.servico.findMany({
      where: { tenantId: tenant.id },
      select: { nome: true },
    });

    const faltam = servicosQueFaltam(existentes);
    if (faltam.length) {
      await this.prisma.servico.createMany({
        data: faltam.map((padrao) => paraCriar(padrao, tenant.id)),
      });
    }

    return {
      criados: faltam.length,
      nomes: faltam.map((s) => s.nome),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async create(
    @Body() data: CriarServicoDto,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.servico.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: data.preco,
        qtdeSlots: data.qtdeSlots,
        imagemURL: data.imagemURL || '',
        ehCombo: data.ehCombo ?? false,
        tenantId: tenant.id,
      },
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: AtualizarServicoDto,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.servico.updateMany({
      where: { id, tenantId: tenant.id },
      data,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.servico.deleteMany({
      where: { id, tenantId: tenant.id },
    });
  }
}
