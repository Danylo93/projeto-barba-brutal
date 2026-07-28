-- Assinatura recorrente do Mercado Pago (preapproval), com cartão ou Pix.

ALTER TABLE "plano" ADD COLUMN "mpPreapprovalPlanId" TEXT;
ALTER TABLE "plano" ADD COLUMN "mpInitPoint" TEXT;
CREATE UNIQUE INDEX "plano_mpPreapprovalPlanId_key" ON "plano"("mpPreapprovalPlanId");

ALTER TABLE "assinatura" ADD COLUMN "mpPreapprovalId" TEXT;
ALTER TABLE "assinatura" ADD COLUMN "meioPagamento" TEXT;
CREATE UNIQUE INDEX "assinatura_mpPreapprovalId_key" ON "assinatura"("mpPreapprovalId");

-- Quem já paga hoje paga por Pix avulso (QR Code confirmado manualmente).
UPDATE "assinatura" SET "meioPagamento" = 'pix_avulso' WHERE "status" = 'active';
