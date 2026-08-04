-- Sessão única por conta.
--
-- Antes qualquer token assinado valia até expirar (15 dias), de quantos
-- dispositivos fossem. Não havia como derrubar um acesso: senha trocada,
-- funcionário desligado, celular perdido — o token antigo continuava abrindo
-- a agenda, o financeiro e os dados dos clientes.
--
-- Agora cada login grava um `sessaoId` novo e o põe dentro do token. Toda
-- requisição compara os dois: quem tem o valor antigo cai. Não precisa de
-- lista de tokens revogados e não custa consulta extra — o guard já lia a
-- conta a cada requisição.
ALTER TABLE "tenant"  ADD COLUMN "sessaoId" TEXT;
ALTER TABLE "usuario" ADD COLUMN "sessaoId" TEXT;
ALTER TABLE "admin"   ADD COLUMN "sessaoId" TEXT;
