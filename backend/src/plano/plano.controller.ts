import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PlanoService } from './plano.service';

@Controller('planos')
export class PlanoController {
  constructor(private readonly planoService: PlanoService) {}

  @Get()
  findAll() {
    return this.planoService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.planoService.findById(id);
  }

  @Post()
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
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.planoService.delete(id);
  }
}
