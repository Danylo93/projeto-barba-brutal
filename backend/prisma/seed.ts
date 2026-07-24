import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Iniciando seed do sistema SaaS...');
    
    // 1. Criar planos de assinatura
    console.log('📋 Criando planos de assinatura...');
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
        ativo: true,
      },
      {
        nome: 'Profissional',
        descricao: 'Para barbearias em crescimento',
        preco: 99.90,
        duracao: 30,
        maxUsuarios: 5,
        maxAgendamentos: 1000,
        features: ['Até 5 barbeiros', 'Agendamentos online', 'Gestão de clientes', 'Relatórios avançados', 'Integração WhatsApp'],
        ativo: true,
      },
      {
        nome: 'Premium',
        descricao: 'Para barbearias e redes de qualquer tamanho',
        preco: 159.90,
        duracao: 30,
        maxUsuarios: 999999,
        maxAgendamentos: 999999,
        features: ['Barbeiros ilimitados', 'Agendamentos ilimitados', 'Relatórios completos', 'Integração WhatsApp', 'Suporte prioritário 24/7'],
        ativo: true,
      },
    ];

    await prisma.plano.createMany({
      data: planos,
      skipDuplicates: true,
    });
    console.log('✅ Planos criados');

    // 2. Criar admin do sistema
    console.log('👤 Criando admin do sistema...');
    await prisma.admin.upsert({
      where: { email: 'admin@barbabrutal.app' },
      update: {},
      create: {
        nome: 'Administrador do Sistema',
        email: 'admin@barbabrutal.app',
        senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6', // senha: #Senha123
        ativo: true,
      },
    });
    console.log('✅ Admin criado');

    // 3. Criar tenants (barbearias) de exemplo
    console.log('🏢 Criando tenants de exemplo...');
    
    const tenant1 = await prisma.tenant.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        nome: 'Barbearia do Marcão',
        email: 'contato@barbeariadomarcao.app',
        telefone: '11999999999',
        endereco: 'Rua das Flores, 123 - São Paulo/SP',
        cnpj: '12.345.678/0001-90',
        dominio: 'barbeariadomarcao',
        logo: 'https://example.com/logo-brutal.png',
        corPrimaria: '#1a1a1a',
        corSecundaria: '#ffd700',
        senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6', // #Senha123
        ativo: true,
      },
    });

    const tenant2 = await prisma.tenant.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        nome: 'Corte & Estilo',
        email: 'contato@corteestilo.app',
        telefone: '11888888888',
        endereco: 'Av. Paulista, 1000 - São Paulo/SP',
        cnpj: '98.765.432/0001-10',
        dominio: 'corteestilo',
        logo: 'https://example.com/logo-corte.png',
        corPrimaria: '#0066cc',
        corSecundaria: '#ffffff',
        senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6', // #Senha123
        ativo: true,
      },
    });

    console.log('✅ Tenants criados');

    // 4. Criar assinaturas para os tenants
    console.log('💳 Criando assinaturas...');
    
    const planoBasico = await prisma.plano.findFirst({ where: { nome: 'Básico' } });
    const planoProfissional = await prisma.plano.findFirst({ where: { nome: 'Profissional' } });

    await prisma.assinatura.upsert({
      where: { tenantId: 1 },
      update: {},
      create: {
        tenantId: 1,
        planoId: planoBasico!.id,
        status: 'active',
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        renovacaoAutomatica: true,
      },
    });

    await prisma.assinatura.upsert({
      where: { tenantId: 2 },
      update: {},
      create: {
        tenantId: 2,
        planoId: planoProfissional!.id,
        status: 'active',
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        renovacaoAutomatica: true,
      },
    });

    console.log('✅ Assinaturas criadas');

    // 5. Criar dados para cada tenant
    console.log('👥 Criando usuários, profissionais e serviços...');

    // Tenant 1 - Barbearia do Marcão
    const usuarios1 = [
      {
        nome: 'Marcão Machadada',
        email: 'marcao@barbeariadomarcao.app',
        senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6', // #Senha123
        telefone: '5511915036789', // com DDI 55 para o WhatsApp (Evolution/n8n)
        barbeiro: true,
        tenantId: 1,
      },
      {
        nome: 'João Silva',
        email: 'joao@barbeariadomarcao.app',
        senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6',
        telefone: '5511964891128', // com DDI 55 para o WhatsApp (Evolution/n8n)
        barbeiro: false,
        tenantId: 1,
      },
    ];

    const profissionais1 = [
      {
        nome: 'Marcão Machadada',
        descricao: 'Especialista em cortes modernos e barbas',
        imagemUrl: 'https://example.com/marcao.jpg',
        avaliacao: 4.9,
        quantidadeAvaliacoes: 250,
        tenantId: 1,
        ativo: true,
      },
      {
        nome: 'Carlos Barba',
        descricao: 'Especialista em barba e bigode',
        imagemUrl: 'https://example.com/carlos.jpg',
        avaliacao: 4.8,
        quantidadeAvaliacoes: 180,
        tenantId: 1,
        ativo: true,
      },
    ];

    const servicos1 = [
      {
        nome: 'Corte de Cabelo',
        descricao: 'Corte moderno e estiloso',
        preco: 25.00,
        qtdeSlots: 1,
        imagemURL: 'https://example.com/corte.jpg',
        tenantId: 1,
        ativo: true,
      },
      {
        nome: 'Corte de Barba',
        descricao: 'Barba bem feita e estilosa',
        preco: 20.00,
        qtdeSlots: 1,
        imagemURL: 'https://example.com/barba.jpg',
        tenantId: 1,
        ativo: true,
      },
      {
        nome: 'Combo Completo',
        descricao: 'Corte + Barba + Sobrancelha',
        preco: 40.00,
        qtdeSlots: 2,
        imagemURL: 'https://example.com/combo.jpg',
        tenantId: 1,
        ativo: true,
      },
    ];

    // Tenant 2 - Corte & Estilo
    const usuarios2 = [
      {
        nome: 'Ana Estilista',
        email: 'ana@corteestilo.app',
        senha: '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6',
        telefone: '11777777777',
        barbeiro: true,
        tenantId: 2,
      },
    ];

    const profissionais2 = [
      {
        nome: 'Ana Estilista',
        descricao: 'Especialista em cortes femininos e masculinos',
        imagemUrl: 'https://example.com/ana.jpg',
        avaliacao: 4.7,
        quantidadeAvaliacoes: 120,
        tenantId: 2,
        ativo: true,
      },
      {
        nome: 'Pedro Cabeleireiro',
        descricao: 'Especialista em cortes clássicos',
        imagemUrl: 'https://example.com/pedro.jpg',
        avaliacao: 4.6,
        quantidadeAvaliacoes: 95,
        tenantId: 2,
        ativo: true,
      },
    ];

    const servicos2 = [
      {
        nome: 'Corte Masculino',
        descricao: 'Corte moderno para homens',
        preco: 30.00,
        qtdeSlots: 1,
        imagemURL: 'https://example.com/corte-masculino.jpg',
        tenantId: 2,
        ativo: true,
      },
      {
        nome: 'Corte Feminino',
        descricao: 'Corte e escova para mulheres',
        preco: 45.00,
        qtdeSlots: 2,
        imagemURL: 'https://example.com/corte-feminino.jpg',
        tenantId: 2,
        ativo: true,
      },
      {
        nome: 'Tratamento Capilar',
        descricao: 'Hidratação e tratamento',
        preco: 60.00,
        qtdeSlots: 3,
        imagemURL: 'https://example.com/tratamento.jpg',
        tenantId: 2,
        ativo: true,
      },
    ];

    // Criar dados para tenant 1
    await prisma.usuario.createMany({
      data: usuarios1,
      skipDuplicates: true,
    });

    await prisma.profissional.createMany({
      data: profissionais1,
      skipDuplicates: true,
    });

    await prisma.servico.createMany({
      data: servicos1,
      skipDuplicates: true,
    });

    // Liga o profissional Marcão ao usuário Marcão (para o telefone do barbeiro
    // resolver no fluxo de WhatsApp: profissional -> usuario -> telefone).
    const marcaoUsuario = await prisma.usuario.findFirst({
      where: { tenantId: 1, email: 'marcao@barbeariadomarcao.app' },
    });
    if (marcaoUsuario) {
      await prisma.profissional.updateMany({
        where: { tenantId: 1, nome: 'Marcão Machadada', usuarioId: null },
        data: { usuarioId: marcaoUsuario.id },
      });
    }

    // Criar dados para tenant 2
    await prisma.usuario.createMany({
      data: usuarios2,
      skipDuplicates: true,
    });

    await prisma.profissional.createMany({
      data: profissionais2,
      skipDuplicates: true,
    });

    await prisma.servico.createMany({
      data: servicos2,
      skipDuplicates: true,
    });

    console.log('✅ Dados dos tenants criados');
    console.log('🎉 Seed do sistema SaaS concluído com sucesso!');
    console.log('');
    console.log('📊 Resumo:');
    console.log(`- ${planos.length} planos de assinatura`);
    console.log('- 1 admin do sistema');
    console.log('- 2 tenants (barbearias)');
    console.log('- 2 assinaturas ativas');
    console.log('- 3 usuários');
    console.log('- 4 profissionais');
    console.log('- 6 serviços');

  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
