import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class PlanoService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { preco: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.plano.findUnique({
      where: { id },
    });
  }

  async create(data: {
    nome: string;
    descricao: string;
    preco: number;
    duracao: number;
    maxUsuarios: number;
    maxAgendamentos: number;
    features: string[];
  }) {
    return this.prisma.plano.create({
      data,
    });
  }

  async update(id: number, data: Partial<{
    nome: string;
    descricao: string;
    preco: number;
    duracao: number;
    maxUsuarios: number;
    maxAgendamentos: number;
    features: string[];
    ativo: boolean;
  }>) {
    return this.prisma.plano.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.plano.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
