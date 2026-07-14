import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant, CurrentTenantId } from '../auth/current-tenant.decorator';

@Controller('profissionais')
export class ProfissionalController {
  constructor(private readonly prisma: PrismaService) {}

  // Leitura: qualquer usuário autenticado do tenant (inclui clientes no agendamento)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentTenantId() tenantId: number) {
    return this.prisma.profissional.findMany({
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
    return this.prisma.profissional.findFirst({
      where: { id, tenantId },
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async create(
    @Body() data: {
      nome: string;
      descricao: string;
      imagemUrl: string;
      avaliacao?: number;
      quantidadeAvaliacoes?: number;
    },
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.profissional.create({
      data: {
        ...data,
        tenantId: tenant.id,
        avaliacao: data.avaliacao || 0,
        quantidadeAvaliacoes: data.quantidadeAvaliacoes || 0,
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
      imagemUrl: string;
      avaliacao: number;
      quantidadeAvaliacoes: number;
      ativo: boolean;
    }>,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.profissional.updateMany({
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
    return this.prisma.profissional.deleteMany({
      where: { id, tenantId: tenant.id },
    });
  }
}

