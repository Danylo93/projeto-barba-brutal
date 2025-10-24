import { PrismaClient } from '@prisma/client';
import {
  Profissional as PrismaProfissional,
  Servico as PrismaServico,
} from 'prisma/prisma-client';
import { servicos, profissionais, Usuario } from '@barba/core';

const prisma = new PrismaClient();

async function seed() {
  await prisma.profissional.createMany({
    data: profissionais as PrismaProfissional[],
  });
  await prisma.servico.createMany({ data: servicos as PrismaServico[] });

  const usuarios: Partial<Usuario>[] = [
    {
      nome: 'Marcão Machadada',
      email: 'marcao@barbabrutal.app',
      // senha é... #Senha123
      senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6',
      telefone: '11999999999',
      barbeiro: true,
    },
  ];

  await prisma.usuario.createMany({ data: usuarios as any });
}

seed();
