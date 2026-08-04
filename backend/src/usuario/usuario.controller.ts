import {
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';

// Login/registro de usuários é feito exclusivamente via /auth/usuario/*
// (os endpoints legados /usuarios/login e /usuarios/registrar assinavam o
// objeto inteiro — incluindo o hash da senha — dentro do JWT).
@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async findAll(@CurrentTenant() tenant: any) {
    return this.prisma.usuario.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        barbeiro: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.usuario.findFirst({
      where: { id, tenantId: tenant.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        barbeiro: true,
        createdAt: true,
      },
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    // Mesmo motivo dos outros: `deleteMany` respondia 200 com `{ count: 0 }`
    // e a tela dizia "cliente excluído" sem ter excluído nada.
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true },
    });
    if (!usuario) {
      throw new NotFoundException('Cliente não encontrado nesta barbearia.');
    }
    await this.prisma.usuario.delete({ where: { id } });
    return { ok: true, id };
  }
}
