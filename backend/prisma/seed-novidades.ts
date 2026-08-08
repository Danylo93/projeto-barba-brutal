/**
 * Liga as funcionalidades novas na barbearia de exemplo, para dar para testar
 * clicando.
 *
 * Roda DEPOIS de `npm run db:seed`. Sem isto, o sinal está desligado, não há
 * produto nenhum e nenhuma recorrência — as telas novas abrem vazias e não
 * dá para saber se funcionam.
 *
 *   npm run db:seed
 *   npm run db:seed-planos
 *   npm run db:seed-novidades
 *
 * É idempotente: rodar duas vezes não duplica nada.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_DA_BARBEARIA = 'contato@barbeariadomarcao.app';

const PRODUTOS = [
  {
    nome: 'Pomada modeladora',
    descricao: '120g, efeito seco',
    precoVenda: 40,
    precoCusto: 32,
    estoque: 12,
    estoqueMinimo: 3,
  },
  {
    nome: 'Óleo para barba',
    descricao: '30ml',
    precoVenda: 55,
    precoCusto: 38,
    estoque: 2, // abaixo do mínimo de propósito: é o alerta de "está acabando"
    estoqueMinimo: 3,
  },
  {
    nome: 'Shampoo anticaspa',
    descricao: '250ml',
    precoVenda: 35,
    precoCusto: 24,
    estoque: 0, // acabou: para ver a recusa da venda sem estoque
    estoqueMinimo: 2,
  },
];

async function main() {
  const barbearia = await prisma.tenant.findUnique({
    where: { email: EMAIL_DA_BARBEARIA },
    select: { id: true, nome: true, dominio: true },
  });
  if (!barbearia) {
    console.error(`Barbearia ${EMAIL_DA_BARBEARIA} não existe. Rode antes: npm run db:seed`);
    process.exit(1);
  }

  // ── sinal e agendamento sem cadastro ─────────────────────────────────────
  await prisma.tenant.update({
    where: { id: barbearia.id },
    data: {
      chavePix: EMAIL_DA_BARBEARIA,
      sinalAtivo: true,
      sinalPercent: 30,
      sinalMinimo: 10,
      sinalPrazoMinutos: 30,
      agendamentoSemConta: true,
    },
  });
  console.log('  sinal ligado: 30%, mínimo R$ 10, prazo de 30 min');
  console.log('  agendamento sem cadastro: ligado');

  // ── produtos ─────────────────────────────────────────────────────────────
  for (const produto of PRODUTOS) {
    const jaExiste = await prisma.produto.findFirst({
      where: { tenantId: barbearia.id, nome: produto.nome },
      select: { id: true },
    });
    if (jaExiste) continue;

    const criado = await prisma.produto.create({
      data: { ...produto, tenantId: barbearia.id, estoque: 0 },
    });

    // O saldo entra como movimento, igual ao que a tela faz — senão o
    // histórico começaria com um número que veio do nada.
    if (produto.estoque > 0) {
      await prisma.movimentoEstoque.create({
        data: {
          tenantId: barbearia.id,
          produtoId: criado.id,
          tipo: 'entrada',
          quantidade: produto.estoque,
          saldoDepois: produto.estoque,
          valorUnitario: produto.precoCusto,
          motivo: 'Estoque inicial',
        },
      });
      await prisma.produto.update({
        where: { id: criado.id },
        data: { estoque: produto.estoque },
      });
    }
  }
  console.log(`  ${PRODUTOS.length} produtos (um acabando, um zerado, de propósito)`);

  // ── uma recorrência ──────────────────────────────────────────────────────
  const [cliente, profissional, servico] = await Promise.all([
    prisma.usuario.findFirst({
      where: { tenantId: barbearia.id, barbeiro: false },
      select: { id: true, nome: true },
    }),
    prisma.profissional.findFirst({
      where: { tenantId: barbearia.id, ativo: true },
      select: { id: true, nome: true },
    }),
    prisma.servico.findFirst({
      where: { tenantId: barbearia.id, ativo: true, ehCombo: false },
      select: { id: true, nome: true },
    }),
  ]);

  if (cliente && profissional && servico) {
    const jaTem = await prisma.serieAgendamento.findFirst({
      where: { tenantId: barbearia.id, usuarioId: cliente.id, ativo: true },
      select: { id: true },
    });
    if (!jaTem) {
      await prisma.serieAgendamento.create({
        data: {
          tenantId: barbearia.id,
          usuarioId: cliente.id,
          profissionalId: profissional.id,
          servicoIds: [servico.id],
          frequencia: 'semanal',
          diaSemana: 6,
          hora: '10:00',
          observacoes: 'Cliente fixo de sábado',
        },
      });
      console.log(`  recorrência: ${cliente.nome}, todo sábado às 10h com ${profissional.nome}`);
      console.log('    (os horários nascem quando você abrir /recorrentes e clicar em gerar,');
      console.log('     ou chamando POST /lembretes/series/gerar)');
    }
  }

  const planos = await prisma.plano.findMany({
    where: { ativo: true },
    orderBy: [{ grupo: 'asc' }, { duracao: 'asc' }],
    select: { nome: true, preco: true, duracao: true },
  });
  console.log('\n  planos ativos:');
  for (const p of planos) {
    console.log(`    ${p.nome.padEnd(22)} R$ ${p.preco.toFixed(2).padStart(7)}  (${p.duracao} dias)`);
  }

  console.log(`\nPronto. Página pública: /barbearia/${barbearia.dominio}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
