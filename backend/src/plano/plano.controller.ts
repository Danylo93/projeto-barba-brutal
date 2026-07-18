import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PlanoService } from './plano.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Controller('planos')
export class PlanoController {
  constructor(private readonly planoService: PlanoService) {}

  // Leitura pública: a landing exibe os planos para venda.
  @Get()
  findAll() {
    return this.planoService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.planoService.findById(id);
  }

  // Gestão de planos é exclusiva do administrador do SaaS.
  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  create(@Body() data: {
    nome: string;
    descricao: string;
    preco: number;
    duracao: number;
    maxUsuarios: number;
    maxAgendamentos: number;
    features: string[];
  }) {
    return this.planoService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<{
      nome: string;
      descricao: string;
      preco: number;
      duracao: number;
      maxUsuarios: number;
      maxAgendamentos: number;
      features: string[];
      ativo: boolean;
    }>
  ) {
    return this.planoService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.planoService.delete(id);
  }
}
