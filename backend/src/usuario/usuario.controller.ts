import { UsuarioRepository } from './usuario.repository';
import { LoginUsuario, RegistrarUsuario, Usuario } from '../types';
import { Body, Controller, Post, Get, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { BcryptProvider } from './bcrypt.provider';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import * as jwt from 'jsonwebtoken';

@Controller('usuarios')
export class UsuarioController {
  constructor(
    private readonly repo: UsuarioRepository,
    private readonly cripto: BcryptProvider,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(
    @Body() dados: { email: string; senha: string },
  ): Promise<{ access_token: string; usuario: any }> {
    const casoDeUso = new LoginUsuario(this.repo, this.cripto);
    const usuario = await casoDeUso.executar(dados.email, dados.senha);
    const segredo = process.env.JWT_SECRET!;
    const token = jwt.sign(usuario, segredo, { expiresIn: '15d' });
    return {
      access_token: token,
      usuario,
    };
  }

  @Post('registrar')
  async registrar(@Body() usuario: Usuario): Promise<void> {
    const casoDeUso = new RegistrarUsuario(this.repo, this.cripto);
    await casoDeUso.executar(usuario);
  }

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
    return this.prisma.usuario.deleteMany({
      where: { id, tenantId: tenant.id },
    });
  }
}
