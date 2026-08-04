import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { tabelaDePrecos, validarPrecoInformado } from '../servico/preco';

/** Uma linha da tela de preços do profissional. */
export interface LinhaDePreco {
  servicoId: number;
  nome: string;
  /** Preço da barbearia — o padrão de quem não personalizou. */
  precoPadrao: number;
  /** Preço que este profissional cobra (personalizado ou o da barbearia). */
  preco: number;
  personalizado: boolean;
}

/** O que o middleware/guard coloca em `request.user`. */
interface UsuarioLogado {
  id: number;
  tipo?: 'tenant' | 'usuario' | 'admin';
  tenantId?: number;
  barbeiro?: boolean;
}

@Injectable()
export class PrecosProfissionalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quem pode mexer no preço de um profissional: o dono da barbearia e o
   * próprio barbeiro. Barbeiro não mexe no preço do colega, e cliente não
   * mexe em preço nenhum.
   */
  async garantirPermissaoDeEscrita(
    profissionalId: number,
    tenantId: number,
    usuario: UsuarioLogado | undefined,
  ): Promise<void> {
    if (!usuario) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const profissional = await this.prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: { usuarioId: true },
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    if (usuario.tipo === 'tenant') return;

    if (usuario.barbeiro && profissional.usuarioId === usuario.id) return;

    throw new ForbiddenException(
      'Só o dono da barbearia e o próprio profissional podem mudar esses preços.',
    );
  }

  /** Serviços que o profissional realiza, com o preço de cada um. */
  async tabela(profissionalId: number, tenantId: number): Promise<LinhaDePreco[]> {
    const profissional = await this.prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: {
        servicos: {
          where: { ativo: true },
          select: { id: true, nome: true, preco: true },
          orderBy: { nome: 'asc' },
        },
        precos: { select: { servicoId: true, preco: true } },
      },
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    const personalizados = new Map(profissional.precos.map((p) => [p.servicoId, p.preco]));
    const tabela = tabelaDePrecos(profissional.servicos, profissional.precos);

    return profissional.servicos.map((servico) => ({
      servicoId: servico.id,
      nome: servico.nome,
      precoPadrao: servico.preco,
      preco: tabela.get(servico.id) ?? servico.preco,
      personalizado: personalizados.has(servico.id),
    }));
  }

  /**
   * Grava os preços informados. `preco` nulo ou vazio apaga a personalização —
   * é assim que o profissional volta a cobrar o preço da barbearia.
   */
  async salvar(
    profissionalId: number,
    tenantId: number,
    precos: { servicoId: number; preco?: number | string | null }[],
  ): Promise<LinhaDePreco[]> {
    if (!Array.isArray(precos)) {
      throw new BadRequestException('Envie a lista de preços.');
    }

    const profissional = await this.prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      // `ativo: true` igual ao da leitura: sem ele dava para gravar preço em
      // serviço desativado — uma linha que nenhuma tela mostrava e ninguém
      // conseguia corrigir, e que voltava a valer quando o serviço reativasse.
      select: { servicos: { where: { ativo: true }, select: { id: true } } },
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }
    const realiza = new Set(profissional.servicos.map((s) => s.id));

    const paraGravar: { servicoId: number; preco: number | null }[] = [];
    for (const linha of precos) {
      const servicoId = Number(linha?.servicoId);
      if (!Number.isInteger(servicoId) || !realiza.has(servicoId)) {
        // Serviço de outra barbearia, ou que este profissional não realiza:
        // sem isto dava para criar preço em cima do serviço do vizinho.
        throw new BadRequestException(
          'Só dá para definir preço de serviço que este profissional realiza.',
        );
      }
      try {
        paraGravar.push({ servicoId, preco: validarPrecoInformado(linha?.preco) });
      } catch (erro) {
        throw new BadRequestException((erro as Error).message);
      }
    }

    await this.prisma.$transaction(
      paraGravar.map((linha) =>
        linha.preco === null
          ? this.prisma.precoProfissional.deleteMany({
              where: { profissionalId, servicoId: linha.servicoId },
            })
          : this.prisma.precoProfissional.upsert({
              where: {
                profissionalId_servicoId: { profissionalId, servicoId: linha.servicoId },
              },
              create: {
                tenantId,
                profissionalId,
                servicoId: linha.servicoId,
                preco: linha.preco,
              },
              update: { preco: linha.preco },
            }),
      ),
    );

    return this.tabela(profissionalId, tenantId);
  }
}
