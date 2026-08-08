import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  aplicarMovimento,
  estoqueBaixo,
  lucroDaVenda,
  TipoDeMovimento,
  tipoValido,
  valorDoEstoque,
} from './estoque';

@Injectable()
export class ProdutoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(tenantId: number, incluirInativos = false) {
    const produtos = await this.prisma.produto.findMany({
      where: { tenantId, ...(incluirInativos ? {} : { ativo: true }) },
      orderBy: { nome: 'asc' },
    });

    return produtos.map((produto) => ({
      ...produto,
      estoqueBaixo: estoqueBaixo(produto),
    }));
  }

  async buscar(tenantId: number, id: number) {
    const produto = await this.prisma.produto.findFirst({ where: { id, tenantId } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    return { ...produto, estoqueBaixo: estoqueBaixo(produto) };
  }

  async criar(tenantId: number, dados: any) {
    const nome = String(dados?.nome ?? '').trim();
    if (nome.length < 2) {
      throw new BadRequestException('O produto precisa de um nome.');
    }

    const precoVenda = this.dinheiro(dados?.precoVenda, 'preço de venda');
    const precoCusto = dados?.precoCusto == null ? 0 : this.dinheiro(dados.precoCusto, 'preço de custo');
    const estoqueInicial = this.inteiroNaoNegativo(dados?.estoque ?? 0, 'estoque');

    const jaExiste = await this.prisma.produto.findFirst({
      where: { tenantId, nome },
      select: { id: true },
    });
    if (jaExiste) {
      throw new BadRequestException(`Já existe um produto chamado "${nome}".`);
    }

    // O estoque inicial nasce como movimento de entrada, e não como número
    // solto na coluna: senão o histórico começaria com um saldo que veio do
    // nada, e a primeira pergunta de auditoria já ficaria sem resposta.
    return this.prisma.$transaction(async (tx) => {
      const produto = await tx.produto.create({
        data: {
          tenantId,
          nome,
          descricao: dados?.descricao ? String(dados.descricao).trim() : null,
          precoVenda,
          precoCusto,
          estoque: 0,
          estoqueMinimo: this.inteiroNaoNegativo(dados?.estoqueMinimo ?? 0, 'estoque mínimo'),
          imagemUrl: dados?.imagemUrl ? String(dados.imagemUrl).trim() : '',
        },
      });

      if (estoqueInicial > 0) {
        await tx.movimentoEstoque.create({
          data: {
            tenantId,
            produtoId: produto.id,
            tipo: 'entrada',
            quantidade: estoqueInicial,
            saldoDepois: estoqueInicial,
            valorUnitario: precoCusto || null,
            motivo: 'Estoque inicial do cadastro',
          },
        });
        return tx.produto.update({
          where: { id: produto.id },
          data: { estoque: estoqueInicial },
        });
      }

      return produto;
    });
  }

  async atualizar(tenantId: number, id: number, dados: any) {
    await this.buscar(tenantId, id);

    const mudancas: any = {};
    if (dados?.nome !== undefined) {
      const nome = String(dados.nome).trim();
      if (nome.length < 2) throw new BadRequestException('O produto precisa de um nome.');
      const outro = await this.prisma.produto.findFirst({
        where: { tenantId, nome, id: { not: id } },
        select: { id: true },
      });
      if (outro) throw new BadRequestException(`Já existe um produto chamado "${nome}".`);
      mudancas.nome = nome;
    }
    if (dados?.descricao !== undefined) mudancas.descricao = String(dados.descricao).trim() || null;
    if (dados?.precoVenda !== undefined) mudancas.precoVenda = this.dinheiro(dados.precoVenda, 'preço de venda');
    if (dados?.precoCusto !== undefined) mudancas.precoCusto = this.dinheiro(dados.precoCusto, 'preço de custo');
    if (dados?.estoqueMinimo !== undefined) {
      mudancas.estoqueMinimo = this.inteiroNaoNegativo(dados.estoqueMinimo, 'estoque mínimo');
    }
    if (dados?.imagemUrl !== undefined) mudancas.imagemUrl = String(dados.imagemUrl).trim();
    if (dados?.ativo !== undefined) mudancas.ativo = Boolean(dados.ativo);

    // O saldo NÃO se edita por aqui de propósito. Mexer no estoque é sempre
    // um movimento, com tipo e motivo — é o que permite explicar depois por
    // que o número mudou.
    return this.prisma.produto.update({ where: { id }, data: mudancas });
  }

  /** Some da vitrine, mas o histórico de vendas continua de pé. */
  async desativar(tenantId: number, id: number) {
    await this.buscar(tenantId, id);
    return this.prisma.produto.update({ where: { id }, data: { ativo: false } });
  }

  /**
   * Registra uma entrada, venda, saída ou ajuste.
   *
   * O saldo e o movimento são gravados na MESMA transação, e o saldo é lido
   * dentro dela: duas vendas no mesmo segundo, em dois celulares diferentes,
   * não podem ler o mesmo saldo e gravar o mesmo resultado.
   */
  async movimentar(
    tenantId: number,
    produtoId: number,
    dados: { tipo: string; quantidade: number; motivo?: string; valorUnitario?: number },
    usuarioId?: number,
  ) {
    if (!tipoValido(dados?.tipo)) {
      throw new BadRequestException(
        'Movimento inválido. Use entrada, venda, saida ou ajuste.',
      );
    }
    const tipo = dados.tipo as TipoDeMovimento;
    const quantidade = Number(dados?.quantidade);
    if (!Number.isFinite(quantidade)) {
      throw new BadRequestException('Informe a quantidade.');
    }

    return this.prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findFirst({ where: { id: produtoId, tenantId } });
      if (!produto) throw new NotFoundException('Produto não encontrado');

      let resultado: { saldoDepois: number; variacao: number };
      try {
        resultado = aplicarMovimento(produto.estoque, tipo, quantidade);
      } catch (erro: any) {
        throw new BadRequestException(erro?.message ?? 'Movimento inválido.');
      }

      const valorUnitario =
        dados?.valorUnitario != null
          ? this.dinheiro(dados.valorUnitario, 'valor')
          : tipo === 'venda'
            ? produto.precoVenda
            : tipo === 'entrada'
              ? produto.precoCusto
              : null;

      const movimento = await tx.movimentoEstoque.create({
        data: {
          tenantId,
          produtoId,
          tipo,
          quantidade: Math.abs(quantidade),
          saldoDepois: resultado.saldoDepois,
          valorUnitario,
          motivo: dados?.motivo ? String(dados.motivo).trim() : null,
          usuarioId: usuarioId ?? null,
        },
      });

      const atualizado = await tx.produto.update({
        where: { id: produtoId },
        data: { estoque: resultado.saldoDepois },
      });

      return {
        movimento,
        produto: { ...atualizado, estoqueBaixo: estoqueBaixo(atualizado) },
      };
    });
  }

  async historico(tenantId: number, produtoId?: number, limite = 100) {
    return this.prisma.movimentoEstoque.findMany({
      where: { tenantId, ...(produtoId ? { produtoId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limite), 500),
      include: { produto: { select: { nome: true } } },
    });
  }

  /** O painel do dono: o que está acabando, o que vendeu e quanto sobrou. */
  async resumo(tenantId: number, desde?: Date) {
    const inicio = desde ?? this.primeiroDiaDoMes();

    const [produtos, vendas] = await Promise.all([
      this.prisma.produto.findMany({ where: { tenantId, ativo: true } }),
      this.prisma.movimentoEstoque.findMany({
        where: { tenantId, tipo: 'venda', createdAt: { gte: inicio } },
        include: { produto: { select: { nome: true, precoCusto: true } } },
      }),
    ]);

    let faturamento = 0;
    let lucro = 0;
    const porProduto = new Map<number, { nome: string; quantidade: number; total: number }>();

    for (const venda of vendas) {
      const precoVenda = venda.valorUnitario ?? 0;
      const precoCusto = venda.produto?.precoCusto ?? 0;
      faturamento += precoVenda * venda.quantidade;
      lucro += lucroDaVenda(precoVenda, precoCusto, venda.quantidade);

      const atual = porProduto.get(venda.produtoId) ?? {
        nome: venda.produto?.nome ?? 'Produto removido',
        quantidade: 0,
        total: 0,
      };
      atual.quantidade += venda.quantidade;
      atual.total += precoVenda * venda.quantidade;
      porProduto.set(venda.produtoId, atual);
    }

    return {
      desde: inicio,
      totalDeProdutos: produtos.length,
      valorDoEstoque: valorDoEstoque(produtos),
      faturamento: Number(faturamento.toFixed(2)),
      lucro: Number(lucro.toFixed(2)),
      precisaRepor: produtos
        .filter((p) => estoqueBaixo(p))
        .map((p) => ({ id: p.id, nome: p.nome, estoque: p.estoque, estoqueMinimo: p.estoqueMinimo })),
      maisVendidos: [...porProduto.values()]
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5)
        .map((v) => ({ ...v, total: Number(v.total.toFixed(2)) })),
    };
  }

  private primeiroDiaDoMes(): Date {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  }

  private dinheiro(valor: unknown, campo: string): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      throw new BadRequestException(`Informe um ${campo} válido.`);
    }
    return Number(numero.toFixed(2));
  }

  private inteiroNaoNegativo(valor: unknown, campo: string): number {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 0) {
      throw new BadRequestException(`O ${campo} tem que ser um número inteiro, a partir de zero.`);
    }
    return numero;
  }
}
