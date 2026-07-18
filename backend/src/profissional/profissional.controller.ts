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
      include: { servicos: { where: { ativo: true }, select: { id: true, nome: true } } },
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
      include: { servicos: { where: { ativo: true }, select: { id: true, nome: true } } },
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

    const servicoIds = await this.validarServicoIds(data.servicoIds, tenant.id);

    return this.prisma.profissional.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        imagemUrl: data.imagemUrl,
        tenantId: tenant.id,
        usuarioId,
        avaliacao: data.avaliacao || 0,
        quantidadeAvaliacoes: data.quantidadeAvaliacoes || 0,
        servicos: servicoIds.length
          ? { connect: servicoIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { servicos: { select: { id: true, nome: true } } },
    });
  }

  /**
   * Mantém apenas os ids de serviço que pertencem ao próprio tenant,
   * evitando vincular serviços de outra barbearia.
   */
  private async validarServicoIds(
    servicoIds: number[] | undefined,
    tenantId: number,
  ): Promise<number[]> {
    if (!servicoIds || servicoIds.length === 0) return [];
    const servicos = await this.prisma.servico.findMany({
      where: { id: { in: servicoIds }, tenantId },
      select: { id: true },
    });
    return servicos.map((s) => s.id);
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

    // `set` substitui totalmente o vínculo; só aplica quando o campo foi enviado.
    let servicosUpdate: any = undefined;
    if (data.servicoIds !== undefined) {
      const servicoIds = await this.validarServicoIds(data.servicoIds, tenant.id);
      servicosUpdate = { set: servicoIds.map((sid) => ({ id: sid })) };
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
        servicos: servicosUpdate,
      },
      include: { servicos: { select: { id: true, nome: true } } },
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

