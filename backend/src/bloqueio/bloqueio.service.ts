import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

export interface NovoBloqueio {
  profissionalId?: number | null;
  inicio: string | Date;
  fim: string | Date;
  motivo?: string;
}

/**
 * Bloqueios de agenda: folga, almoço, férias ou feriado.
 * Com `profissionalId` nulo o bloqueio vale para a barbearia inteira.
 */
@Injectable()
export class BloqueioService {
  constructor(private readonly prisma: PrismaService) {}

  /** Valida e normaliza o intervalo informado. */
  private validarIntervalo(inicio: string | Date, fim: string | Date) {
    const de = new Date(inicio);
    const ate = new Date(fim);
    if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) {
      throw new BadRequestException('Informe um início e um fim válidos.');
    }
    if (ate.getTime() <= de.getTime()) {
      throw new BadRequestException('O fim do bloqueio deve ser depois do início.');
    }
    const UM_ANO = 365 * 24 * 60 * 60 * 1000;
    if (ate.getTime() - de.getTime() > UM_ANO) {
      throw new BadRequestException('O bloqueio não pode passar de um ano.');
    }
    return { de, ate };
  }

  /** Confere se o profissional existe no tenant (quando informado). */
  private async validarProfissional(tenantId: number, profissionalId?: number | null) {
    if (profissionalId === undefined || profissionalId === null) return null;
    const prof = await this.prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: { id: true },
    });
    if (!prof) throw new BadRequestException('Profissional inválido.');
    return prof.id;
  }

  async listar(
    tenantId: number,
    filtros: { profissionalId?: number; de?: string; ate?: string } = {},
  ) {
    const where: any = { tenantId };

    if (filtros.profissionalId) {
      // Inclui os bloqueios da barbearia inteira, que também valem para ele.
      where.OR = [{ profissionalId: filtros.profissionalId }, { profissionalId: null }];
    }
    if (filtros.de || filtros.ate) {
      where.fim = filtros.de ? { gte: new Date(filtros.de) } : undefined;
      where.inicio = filtros.ate ? { lte: new Date(filtros.ate) } : undefined;
    } else {
      // Sem filtro: mostra o que ainda está por vir (e o que está acontecendo agora).
      where.fim = { gte: new Date() };
    }

    return this.prisma.bloqueio.findMany({
      where,
      include: { profissional: { select: { id: true, nome: true } } },
      orderBy: { inicio: 'asc' },
    });
  }

  async criar(tenantId: number, dados: NovoBloqueio) {
    const { de, ate } = this.validarIntervalo(dados.inicio, dados.fim);
    const profissionalId = await this.validarProfissional(tenantId, dados.profissionalId);

    return this.prisma.bloqueio.create({
      data: {
        tenantId,
        profissionalId,
        inicio: de,
        fim: ate,
        motivo: dados.motivo?.trim() || null,
      },
      include: { profissional: { select: { id: true, nome: true } } },
    });
  }

  async remover(tenantId: number, id: number) {
    const bloqueio = await this.prisma.bloqueio.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!bloqueio) throw new NotFoundException('Bloqueio não encontrado.');
    await this.prisma.bloqueio.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Bloqueio do próprio barbeiro: descobre o profissional ligado ao usuário
   * logado e garante que ele só mexa na própria agenda.
   */
  async profissionalDoUsuario(usuarioId: number, tenantId: number) {
    const prof = await this.prisma.profissional.findFirst({
      where: { usuarioId, tenantId },
      select: { id: true },
    });
    if (!prof) {
      throw new ForbiddenException(
        'Seu usuário não está vinculado a um profissional desta barbearia.',
      );
    }
    return prof.id;
  }
}
