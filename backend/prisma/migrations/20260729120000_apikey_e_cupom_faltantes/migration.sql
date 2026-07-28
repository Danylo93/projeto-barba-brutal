-- Corrige um drift que derrubou a produção.
--
-- O commit que trouxe a chave de API e o módulo de cupons alterou o
-- schema.prisma sem gerar migration. Enquanto o Prisma Client em produção
-- vinha de um build antigo, ninguém percebeu; no primeiro rebuild o cliente
-- passou a pedir `tenant.apiKey`, que nunca existiu no banco, e TODA consulta
-- que lê a tabela tenant inteira passou a estourar P2022 — login de dono,
-- login de cliente e a página pública da barbearia.
--
-- IF NOT EXISTS em tudo: este banco já passou por `db push` em algum momento,
-- então parte disso pode existir em um ambiente e não em outro.

ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_apiKey_key" ON "tenant"("apiKey");

CREATE TABLE IF NOT EXISTS "cupom" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "validoAte" TIMESTAMP(3),
    "usos" INTEGER NOT NULL DEFAULT 0,
    "maxUsos" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cupom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cupom_codigo_tenantId_key" ON "cupom"("codigo", "tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cupom_tenantId_fkey'
  ) THEN
    ALTER TABLE "cupom" ADD CONSTRAINT "cupom_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
