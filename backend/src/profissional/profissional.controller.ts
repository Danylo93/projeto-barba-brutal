import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';

@Controller('profissionais')
@UseGuards(JwtAuthGuard, TenantAuthGuard)
export class ProfissionalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@CurrentTenant() tenant: any) {
    return this.prisma.profissional.findMany({
      where: { tenantId: tenant.id },
      orderBy: { nome: 'asc' },
    });
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.profissional.findFirst({
      where: { id, tenantId: tenant.id },
    });
  }

  @Post()
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
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.profissional.deleteMany({
      where: { id, tenantId: tenant.id },
    });
  }
}

