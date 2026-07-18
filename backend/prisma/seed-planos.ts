import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar planos iniciais
  // maxUsuarios representa o número de barbeiros permitidos no plano.
  const planos = [
    {
      nome: 'Básico',
      descricao: 'Ideal para quem trabalha sozinho',
      preco: 49.90,
      duracao: 30,
      maxUsuarios: 1,
      maxAgendamentos: 200,
      features: ['1 barbeiro', 'Agendamentos online', 'Gestão de clientes', 'Relatórios básicos'],
    },
    {
      nome: 'Profissional',
      descricao: 'Para barbearias em crescimento',
      preco: 99.90,
      duracao: 30,
      maxUsuarios: 5,
      maxAgendamentos: 1000,
      features: ['Até 5 barbeiros', 'Agendamentos online', 'Gestão de clientes', 'Relatórios avançados', 'Integração WhatsApp'],
    },
    {
      nome: 'Premium',
      descricao: 'Para barbearias e redes de qualquer tamanho',
      preco: 159.90,
      duracao: 30,
      maxUsuarios: 999999,
      maxAgendamentos: 999999,
      features: ['Barbeiros ilimitados', 'Agendamentos ilimitados', 'Relatórios completos', 'Integração WhatsApp', 'Suporte prioritário 24/7'],
    },
  ];

  for (const plano of planos) {
    await prisma.plano.upsert({
      where: { nome: plano.nome },
      update: plano,
      create: plano,
    });
  }

  console.log('Planos criados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
