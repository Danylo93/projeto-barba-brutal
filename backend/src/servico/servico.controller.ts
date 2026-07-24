import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant, CurrentTenantId } from '../auth/current-tenant.decorator';

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

  @Post()
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async create(
    @Body() data: {
      nome: string;
      descricao: string;
      preco: number;
      qtdeSlots: number;
      imagemURL?: string;
      ehCombo?: boolean;
    },
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
    @Body() data: Partial<{
      nome: string;
      descricao: string;
      preco: number;
      qtdeSlots: number;
      imagemURL: string;
      ativo: boolean;
      ehCombo: boolean;
    }>,
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
