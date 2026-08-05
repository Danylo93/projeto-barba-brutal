const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Buscando tenant 14...');
    const tenant = await prisma.tenant.findUnique({ where: { id: 14 } });
    console.log('Tenant 14 atual:', tenant);
    
    if (tenant) {
        console.log('Atualizando para latita...');
        const updated = await prisma.tenant.update({
            where: { id: 14 },
            data: { dominio: 'latita' }
        });
        console.log('Atualizado:', updated);
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
