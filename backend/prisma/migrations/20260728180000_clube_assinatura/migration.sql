-- Clube de assinatura da barbearia (pago via Pix direto para ela).

ALTER TABLE "tenant" ADD COLUMN "chavePix" TEXT;

CREATE TABLE "plano_clube" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DOUBLE PRECISION NOT NULL,
    "beneficios" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plano_clube_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plano_clube_nome_tenantId_key" ON "plano_clube"("nome", "tenantId");

CREATE TABLE "assinatura_clube" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "planoClubeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "valor" DOUBLE PRECISION NOT NULL,
    "pixCopiaECola" TEXT,
    "inicio" TIMESTAMP(3),
    "fim" TIMESTAMP(3),
    "confirmadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinatura_clube_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assinatura_clube_tenantId_status_idx" ON "assinatura_clube"("tenantId", "status");
CREATE INDEX "assinatura_clube_usuarioId_idx" ON "assinatura_clube"("usuarioId");

ALTER TABLE "plano_clube" ADD CONSTRAINT "plano_clube_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinatura_clube" ADD CONSTRAINT "assinatura_clube_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinatura_clube" ADD CONSTRAINT "assinatura_clube_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinatura_clube" ADD CONSTRAINT "assinatura_clube_planoClubeId_fkey"
    FOREIGN KEY ("planoClubeId") REFERENCES "plano_clube"("id") ON DELETE CASCADE ON UPDATE CASCADE;
