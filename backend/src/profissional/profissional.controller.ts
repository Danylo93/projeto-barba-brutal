import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant, CurrentTenantId } from '../auth/current-tenant.decorator';
import * as bcrypt from 'bcrypt';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';

@Controller('profissionais')
export class ProfissionalController {
  constructor(private readonly prisma: PrismaService) {}

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
    @Body() data: CreateProfissionalDto,
    @CurrentTenant() tenant: any,
  ) {
    let usuarioId = null;

    if (data.email && data.senha) {
      const senhaHash = await bcrypt.hash(data.senha, 10);
      const user = await this.prisma.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha: senhaHash,
          telefone: data.telefone || '',
          barbeiro: true,
          tenantId: tenant.id,
        },
      });
      usuarioId = user.id;
    }

    return this.prisma.profissional.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        imagemUrl: data.imagemUrl,
        tenantId: tenant.id,
        usuarioId,
        avaliacao: data.avaliacao || 0,
        quantidadeAvaliacoes: data.quantidadeAvaliacoes || 0,
      },
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateProfissionalDto,
    @CurrentTenant() tenant: any,
  ) {
    const profissional = await this.prisma.profissional.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!profissional) {
      throw new Error('Profissional não encontrado');
    }

    let usuarioId = profissional.usuarioId;

    if (data.email) {
      if (!usuarioId) {
        if (data.senha) {
          const senhaHash = await bcrypt.hash(data.senha, 10);
          const user = await this.prisma.usuario.create({
            data: {
              nome: data.nome || profissional.nome,
              email: data.email,
              senha: senhaHash,
              telefone: data.telefone || '',
              barbeiro: true,
              tenantId: tenant.id,
            },
          });
          usuarioId = user.id;
        }
      } else {
        const updateData: any = {
          nome: data.nome || profissional.nome,
          email: data.email,
        };
        if (data.telefone) updateData.telefone = data.telefone;
        if (data.senha) {
          updateData.senha = await bcrypt.hash(data.senha, 10);
        }
        await this.prisma.usuario.update({
          where: { id: usuarioId },
          data: updateData,
        });
      }
    }

    return this.prisma.profissional.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        imagemUrl: data.imagemUrl,
        avaliacao: data.avaliacao,
        quantidadeAvaliacoes: data.quantidadeAvaliacoes,
        ativo: data.ativo,
        usuarioId,
      },
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

