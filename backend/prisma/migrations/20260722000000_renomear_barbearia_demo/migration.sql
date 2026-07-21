-- Renomeia a barbearia de DEMONSTRAÇÃO (tenant 1) para não confundir com a
-- marca do SaaS ("Barbearia Brutal"). As instruções são guardadas pelos valores
-- atuais, então só têm efeito se os dados ainda estiverem como no seed original.

UPDATE "tenant"
SET "nome" = 'Barbearia do Marcão',
    "email" = 'contato@barbeariadomarcao.app',
    "dominio" = 'barbeariadomarcao'
WHERE "id" = 1 AND "nome" = 'Barbearia Brutal';

UPDATE "usuario" SET "email" = 'marcao@barbeariadomarcao.app'
WHERE "tenantId" = 1 AND "email" = 'marcao@barbabrutal.app';

UPDATE "usuario" SET "email" = 'joao@barbeariadomarcao.app'
WHERE "tenantId" = 1 AND "email" = 'joao@barbabrutal.app';
