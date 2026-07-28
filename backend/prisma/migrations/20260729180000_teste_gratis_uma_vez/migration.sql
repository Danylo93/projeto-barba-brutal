-- Teste grátis é uma vez por barbearia.
-- Sem esta marca, cancelar a assinatura e escolher um plano de novo criava
-- outro "trialing" de 30 dias — de graça, todo mês, e ainda dava para pular
-- do Básico para o Premium.

ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "testeGratisUsadoEm" TIMESTAMP(3);

-- Quem já está (ou esteve) em teste tem o teste marcado como gasto, com a
-- data de início da assinatura. Sem isso, todo mundo ganharia um teste novo.
UPDATE "tenant" t
SET "testeGratisUsadoEm" = a."dataInicio"
FROM "assinatura" a
WHERE a."tenantId" = t."id"
  AND t."testeGratisUsadoEm" IS NULL
  AND (a."emTeste" = true OR a."status" IN ('trialing', 'canceled'));
