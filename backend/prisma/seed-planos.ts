import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar planos iniciais
  const planos = [
    {
      nome: 'Básico',
      descricao: 'Plano básico para barbearias pequenas',
      preco: 29.90,
      duracao: 30,
      maxUsuarios: 5,
      maxAgendamentos: 100,
      features: ['Agendamentos', 'Gestão de clientes', 'Relatórios básicos'],
    },
    {
      nome: 'Profissional',
      descricao: 'Plano profissional para barbearias médias',
      preco: 59.90,
      duracao: 30,
      maxUsuarios: 15,
      maxAgendamentos: 500,
      features: ['Agendamentos', 'Gestão de clientes', 'Relatórios avançados', 'Marketing', 'Integração WhatsApp'],
    },
    {
      nome: 'Premium',
      descricao: 'Plano premium para barbearias grandes',
      preco: 99.90,
      duracao: 30,
      maxUsuarios: 50,
      maxAgendamentos: 2000,
      features: ['Agendamentos', 'Gestão de clientes', 'Relatórios avançados', 'Marketing', 'Integração WhatsApp', 'API personalizada', 'Suporte prioritário'],
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
