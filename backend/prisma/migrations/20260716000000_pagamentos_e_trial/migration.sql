-- AlterTable
ALTER TABLE "assinatura" ADD COLUMN     "emTeste" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "profissional" ADD COLUMN     "usuarioId" INTEGER;

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "configuracoes" JSONB;

-- CreateTable
CREATE TABLE "pagamento" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "planoId" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'pix',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mpPaymentId" TEXT,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_mpPaymentId_key" ON "pagamento"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "profissional_usuarioId_key" ON "profissional"("usuarioId");

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissional" ADD CONSTRAINT "profissional_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

