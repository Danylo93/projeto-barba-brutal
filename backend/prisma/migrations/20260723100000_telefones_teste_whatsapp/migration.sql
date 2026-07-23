-- Dados de teste do fluxo de WhatsApp (n8n + Evolution API) na Barbearia do Marcão.
-- Define telefones reais (com DDI 55) do barbeiro Marcão e do cliente João, e liga
-- o profissional Marcão ao usuário Marcão para o telefone do barbeiro resolver na
-- consulta do n8n (profissional -> usuario -> telefone).

UPDATE "usuario" SET "telefone" = '5511915036789'
WHERE "tenantId" = 1 AND "email" = 'marcao@barbeariadomarcao.app';

UPDATE "usuario" SET "telefone" = '5511964891128'
WHERE "tenantId" = 1 AND "email" = 'joao@barbeariadomarcao.app';

UPDATE "profissional" p
SET "usuarioId" = u.id
FROM "usuario" u
WHERE p."tenantId" = 1
  AND p."nome" = 'Marcão Machadada'
  AND u."tenantId" = 1
  AND u."email" = 'marcao@barbeariadomarcao.app'
  AND p."usuarioId" IS NULL;
