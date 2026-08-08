import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { linhasDoCatalogo } from './catalogo';

@Injectable()
export class PlanoService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { preco: 'asc' },
    });
  }

  /**
   * Põe o banco de acordo com o catálogo do código.
   *
   * Existe porque a migração roda sozinha no deploy, mas o seed não — sem
   * isto o plano anual existiria no código e não na vitrine. Como mexe em
   * preço, é ação explícita do admin do SaaS, e não efeito colateral de subir
   * uma versão.
   *
   * Não reajusta quem já assina: a recorrência do Mercado Pago nasce com o
   * valor congelado na contratação. O que muda é o que a próxima barbearia
   * vai pagar.
   *
   * Com `simular`, só conta o que mudaria — dá para conferir a lista antes de
   * mexer em dinheiro.
   */
  async sincronizarComOCatalogo(simular = false) {
    const atuais = await this.prisma.plano.findMany();
    const porNome = new Map(atuais.map((p) => [p.nome, p]));
    const linhas = linhasDoCatalogo();

    const mudancas: Array<{
      nome: string;
      acao: 'criar' | 'atualizar' | 'sem mudança';
      de?: number;
      para: number;
    }> = [];

    for (const linha of linhas) {
      const antes = porNome.get(linha.nome);
      if (!antes) {
        mudancas.push({ nome: linha.nome, acao: 'criar', para: linha.preco });
      } else if (
        antes.preco !== linha.preco ||
        antes.maxUsuarios !== linha.maxUsuarios ||
        antes.maxAgendamentos !== linha.maxAgendamentos ||
        antes.duracao !== linha.duracao ||
        !antes.ativo
      ) {
        mudancas.push({
          nome: linha.nome,
          acao: 'atualizar',
          de: antes.preco,
          para: linha.preco,
        });
      } else {
        mudancas.push({ nome: linha.nome, acao: 'sem mudança', para: linha.preco });
      }
    }

    const nomesDoCatalogo = linhas.map((l) => l.nome);
    const aposentar = atuais.filter((p) => !nomesDoCatalogo.includes(p.nome) && p.ativo);

    if (simular) {
      return {
        simulacao: true,
        mudancas,
        aposentar: aposentar.map((p) => p.nome),
      };
    }

    for (const linha of linhas) {
      await this.prisma.plano.upsert({
        where: { nome: linha.nome },
        update: { ...linha, ativo: true },
        create: { ...linha, ativo: true },
      });
    }

    // Plano fora do catálogo NÃO é apagado: assinatura viva aponta para ele.
    // Fica inativo, que tira da vitrine sem quebrar quem já paga.
    if (aposentar.length > 0) {
      await this.prisma.plano.updateMany({
        where: { id: { in: aposentar.map((p) => p.id) } },
        data: { ativo: false },
      });
    }

    return {
      simulacao: false,
      mudancas,
      aposentados: aposentar.map((p) => p.nome),
    };
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
