-- Rode este SQL no MESMO banco que o backend usa (o do DATABASE_URL).
-- Define os telefones de teste do WhatsApp na Barbearia do Marcão (tenant 1).
-- Em produção isso já é aplicado pela migração 20260723100000_telefones_teste_whatsapp.

UPDATE "usuario" SET "telefone" = '5511915036789'
WHERE "tenantId" = 1 AND "email" = 'marcao@barbeariadomarcao.app';   -- Barbeiro Marcão

UPDATE "usuario" SET "telefone" = '5511964891128'
WHERE "tenantId" = 1 AND "email" = 'joao@barbeariadomarcao.app';     -- Cliente João

-- Liga o profissional Marcão ao usuário Marcão (telefone do barbeiro).
UPDATE "profissional" p
SET "usuarioId" = u.id
FROM "usuario" u
WHERE p."tenantId" = 1 AND p."nome" = 'Marcão Machadada'
  AND u."tenantId" = 1 AND u."email" = 'marcao@barbeariadomarcao.app'
  AND p."usuarioId" IS NULL;

-- Conferir:
-- SELECT nome, email, telefone FROM "usuario" WHERE "tenantId"=1;
