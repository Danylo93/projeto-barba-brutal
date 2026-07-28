import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { gerarPixCopiaECola, validarChavePix } from './pix-brcode';

export interface DadosPlanoClube {
  nome: string;
  descricao?: string;
  preco: number;
  beneficios?: string[];
  ativo?: boolean;
}

/** Assinatura vale 30 dias a partir da confirmação do pagamento. */
const DIAS_DE_VIGENCIA = 30;

/**
 * Clube de assinatura da barbearia: o dono cria planos e os clientes assinam.
 * O pagamento é por Pix direto para a barbearia (a chave é dela), então o
 * sistema apenas gera o "copia e cola" e registra a confirmação do dono.
 */
@Injectable()
export class ClubeService {
  constructor(private readonly prisma: PrismaService) {}

  /* ----------------------------- planos ----------------------------- */

  listarPlanos(tenantId: number, apenasAtivos = false) {
    return this.prisma.planoClube.findMany({
      where: { tenantId, ...(apenasAtivos ? { ativo: true } : {}) },
      orderBy: { preco: 'asc' },
      include: { _count: { select: { assinaturas: true } } },
    });
  }

  private validarPlano(dados: DadosPlanoClube) {
    if (!dados.nome?.trim()) {
      throw new BadRequestException('Informe o nome do plano.');
    }
    const preco = Number(dados.preco);
    if (!Number.isFinite(preco) || preco <= 0) {
      throw new BadRequestException('Informe um preço maior que zero.');
    }
    if (preco > 100000) {
      throw new BadRequestException('Preço fora do limite permitido.');
    }
    return {
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      preco: Math.round(preco * 100) / 100,
      beneficios: (dados.beneficios ?? [])
        .map((b) => String(b).trim())
        .filter(Boolean)
        .slice(0, 12),
      ativo: dados.ativo ?? true,
    };
  }

  async criarPlano(tenantId: number, dados: DadosPlanoClube) {
    const limpo = this.validarPlano(dados);
    const jaExiste = await this.prisma.planoClube.findFirst({
      where: { tenantId, nome: limpo.nome },
      select: { id: true },
    });
    if (jaExiste) {
      throw new BadRequestException('Já existe um plano com esse nome.');
    }
    return this.prisma.planoClube.create({ data: { tenantId, ...limpo } });
  }

  async atualizarPlano(tenantId: number, id: number, dados: DadosPlanoClube) {
    await this.buscarPlanoDoTenant(tenantId, id);
    const limpo = this.validarPlano(dados);
    return this.prisma.planoClube.update({ where: { id }, data: limpo });
  }

  async removerPlano(tenantId: number, id: number) {
    await this.buscarPlanoDoTenant(tenantId, id);
    const assinantes = await this.prisma.assinaturaClube.count({
      where: { planoClubeId: id, status: 'ativa' },
    });
    if (assinantes > 0) {
      // Não apaga histórico de quem paga: desativa para não aparecer mais.
      return this.prisma.planoClube.update({
        where: { id },
        data: { ativo: false },
      });
    }
    await this.prisma.planoClube.delete({ where: { id } });
    return { ok: true };
  }

  private async buscarPlanoDoTenant(tenantId: number, id: number) {
    const plano = await this.prisma.planoClube.findFirst({
      where: { id, tenantId },
    });
    if (!plano) throw new NotFoundException('Plano não encontrado.');
    return plano;
  }

  /* --------------------------- chave Pix --------------------------- */

  async definirChavePix(tenantId: number, chavePix: string) {
    const chave = (chavePix || '').trim();
    if (chave && !validarChavePix(chave)) {
      throw new BadRequestException(
        'Chave Pix inválida. Use CPF, CNPJ, e-mail, telefone (+55…) ou chave aleatória.',
      );
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { chavePix: chave || null },
    });
    return { chavePix: chave || null };
  }

  /* -------------------------- assinaturas -------------------------- */

  /** Assinaturas do clube (visão do dono). */
  listarAssinaturas(tenantId: number, status?: string) {
    return this.prisma.assinaturaClube.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        usuario: { select: { id: true, nome: true, email: true, telefone: true } },
        plano: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Assinaturas do próprio cliente. */
  listarMinhasAssinaturas(usuarioId: number, tenantId: number) {
    return this.prisma.assinaturaClube.findMany({
      where: { usuarioId, tenantId },
      include: { plano: { select: { id: true, nome: true, beneficios: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cliente contrata um plano: cria a assinatura pendente e devolve o Pix
   * copia e cola para ele pagar direto na conta da barbearia.
   */
  async assinar(tenantId: number, usuarioId: number, planoClubeId: number) {
    const [plano, tenant, jaAtiva] = await Promise.all([
      this.prisma.planoClube.findFirst({
        where: { id: planoClubeId, tenantId, ativo: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { nome: true, chavePix: true, endereco: true },
      }),
      this.prisma.assinaturaClube.findFirst({
        where: { usuarioId, tenantId, status: { in: ['pendente', 'ativa'] } },
        select: { id: true, status: true },
      }),
    ]);

    if (!plano) throw new NotFoundException('Plano indisponível.');
    if (!tenant?.chavePix) {
      throw new BadRequestException(
        'Esta barbearia ainda não configurou a chave Pix do clube.',
      );
    }
    if (jaAtiva) {
      throw new BadRequestException(
        jaAtiva.status === 'ativa'
          ? 'Você já tem uma assinatura ativa no clube.'
          : 'Você já tem uma assinatura aguardando pagamento.',
      );
    }

    const criada = await this.prisma.assinaturaClube.create({
      data: {
        tenantId,
        usuarioId,
        planoClubeId: plano.id,
        valor: plano.preco,
        status: 'pendente',
      },
    });

    const pixCopiaECola = gerarPixCopiaECola({
      chave: tenant.chavePix,
      nome: tenant.nome,
      valor: plano.preco,
      txid: `CLUBE${criada.id}`,
      descricao: plano.nome,
    });

    return this.prisma.assinaturaClube.update({
      where: { id: criada.id },
      data: { pixCopiaECola },
      include: { plano: { select: { nome: true, beneficios: true } } },
    });
  }

  /** Dono confirma que o Pix caiu: a assinatura passa a valer por 30 dias. */
  async confirmarPagamento(tenantId: number, id: number) {
    const assinatura = await this.prisma.assinaturaClube.findFirst({
      where: { id, tenantId },
    });
    if (!assinatura) throw new NotFoundException('Assinatura não encontrada.');
    if (assinatura.status === 'ativa') {
      throw new BadRequestException('Esta assinatura já está ativa.');
    }

    const agora = new Date();
    const fim = new Date(agora);
    fim.setDate(fim.getDate() + DIAS_DE_VIGENCIA);

    return this.prisma.assinaturaClube.update({
      where: { id },
      data: { status: 'ativa', inicio: agora, fim, confirmadoEm: agora },
    });
  }

  /** Cancela a assinatura (dono ou o próprio cliente). */
  async cancelar(tenantId: number, id: number, usuarioId?: number) {
    const assinatura = await this.prisma.assinaturaClube.findFirst({
      where: { id, tenantId, ...(usuarioId ? { usuarioId } : {}) },
    });
    if (!assinatura) throw new NotFoundException('Assinatura não encontrada.');
    return this.prisma.assinaturaClube.update({
      where: { id },
      data: { status: 'cancelada' },
    });
  }

  /** Resumo do clube para o painel do dono. */
  async resumo(tenantId: number) {
    const [ativas, pendentes, planos] = await Promise.all([
      this.prisma.assinaturaClube.findMany({
        where: { tenantId, status: 'ativa' },
        select: { valor: true },
      }),
      this.prisma.assinaturaClube.count({
        where: { tenantId, status: 'pendente' },
      }),
      this.prisma.planoClube.count({ where: { tenantId, ativo: true } }),
    ]);

    const receitaRecorrente = ativas.reduce((s, a) => s + a.valor, 0);
    return {
      assinantesAtivos: ativas.length,
      pagamentosPendentes: pendentes,
      planosAtivos: planos,
      receitaRecorrente: Math.round(receitaRecorrente * 100) / 100,
    };
  }
}
