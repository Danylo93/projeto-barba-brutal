import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

/**
 * Compara as colunas que existem no banco com as que o Prisma espera.
 *
 * Existe porque quando falta uma coluna, toda consulta que lê a tabela inteira
 * estoura 500 com "Internal server error" e nada diz qual coluna é — enquanto
 * consultas que selecionam um subconjunto continuam funcionando, o que torna o
 * sintoma confuso.
 */
@Controller('health')
export class SchemaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('schema')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async conferirSchema() {
    const esperado: Record<string, string[]> = {
      tenant: [
        'id', 'nome', 'email', 'telefone', 'senha', 'endereco', 'documento',
        'tipoDocumento', 'cnpj', 'dominio', 'logo', 'corPrimaria',
        'corSecundaria', 'apiKey', 'stripeCustomerId', 'configuracoes', 'ativo',
        'chavePix', 'createdAt', 'updatedAt',
      ],
      assinatura: [
        'id', 'tenantId', 'planoId', 'status', 'emTeste', 'stripeCustomerId',
        'stripeSubscriptionId', 'mpPreapprovalId', 'meioPagamento',
        'dataInicio', 'dataFim', 'renovacaoAutomatica', 'createdAt', 'updatedAt',
      ],
      plano: [
        'id', 'nome', 'descricao', 'preco', 'duracao', 'maxUsuarios',
        'maxAgendamentos', 'features', 'ativo', 'mpPreapprovalPlanId',
        'mpInitPoint', 'createdAt', 'updatedAt',
      ],
      cupom: [
        'id', 'tenantId', 'codigo', 'tipo', 'valor', 'ativo', 'validoAte',
        'usos', 'maxUsos', 'createdAt', 'updatedAt',
      ],
      usuario: [
        'id', 'nome', 'email', 'senha', 'telefone', 'barbeiro', 'tenantId',
        'ativo', 'createdAt', 'updatedAt',
      ],
    };

    const linhas = await this.prisma.$queryRaw<
      { table_name: string; column_name: string }[]
    >`SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'`;

    const porTabela = new Map<string, Set<string>>();
    for (const l of linhas) {
      if (!porTabela.has(l.table_name)) porTabela.set(l.table_name, new Set());
      porTabela.get(l.table_name)!.add(l.column_name);
    }

    const resultado: Record<string, any> = {};
    let tudoCerto = true;
    for (const [tabela, colunas] of Object.entries(esperado)) {
      const noBanco = porTabela.get(tabela);
      if (!noBanco) {
        resultado[tabela] = { existe: false };
        tudoCerto = false;
        continue;
      }
      const faltando = colunas.filter((c) => !noBanco.has(c));
      if (faltando.length) tudoCerto = false;
      resultado[tabela] = {
        existe: true,
        faltando,
        aMais: [...noBanco].filter((c) => !colunas.includes(c)),
      };
    }

    const migrations = await this.prisma.$queryRaw<
      { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
    >`SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 6`;

    return {
      ok: tudoCerto,
      tabelas: resultado,
      ultimasMigrations: migrations.map((m) => ({
        nome: m.migration_name,
        concluida: !!m.finished_at,
        revertida: !!m.rolled_back_at,
      })),
    };
  }
}
