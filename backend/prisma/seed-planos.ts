/**
 * Cria (ou atualiza) os planos a partir do catálogo.
 *
 * Rodar isto NÃO reajusta quem já assina: a recorrência do Mercado Pago nasce
 * com o valor congelado na contratação. O que muda é o que a landing oferece
 * e o que a próxima barbearia vai pagar.
 *
 *   npm run db:seed-planos
 */
import { PrismaClient } from '@prisma/client';
import { linhasDoCatalogo } from '../src/plano/catalogo';

const prisma = new PrismaClient();

async function main() {
  for (const linha of linhasDoCatalogo()) {
    const antes = await prisma.plano.findUnique({
      where: { nome: linha.nome },
      select: { preco: true },
    });

    await prisma.plano.upsert({
      where: { nome: linha.nome },
      update: linha,
      create: linha,
    });

    const mudou = antes && antes.preco !== linha.preco;
    const situacao = !antes ? 'criado' : mudou ? `${antes.preco} → ${linha.preco}` : 'sem mudança';
    console.log(`  ${linha.nome.padEnd(22)} R$ ${linha.preco.toFixed(2).padStart(7)}  (${situacao})`);
  }

  // Planos que saíram do catálogo não são apagados — assinatura viva ainda
  // aponta para eles. Ficam inativos, que é o que tira da vitrine sem
  // quebrar quem já paga.
  const nomesDoCatalogo = linhasDoCatalogo().map((l) => l.nome);
  const aposentados = await prisma.plano.updateMany({
    where: { nome: { notIn: nomesDoCatalogo }, ativo: true },
    data: { ativo: false },
  });
  if (aposentados.count > 0) {
    console.log(`\n  ${aposentados.count} plano(s) fora do catálogo foram desativados.`);
  }

  console.log('\nPlanos sincronizados com o catálogo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
