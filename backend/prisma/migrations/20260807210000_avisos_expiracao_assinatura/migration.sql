ALTER TABLE "assinatura"
  ADD COLUMN "avisoVencimentoWhatsappEm" TIMESTAMP(3),
  ADD COLUMN "avisoVencimentoEmailEm" TIMESTAMP(3),
  ADD COLUMN "avisoExpiracaoWhatsappEm" TIMESTAMP(3),
  ADD COLUMN "avisoExpiracaoEmailEm" TIMESTAMP(3);

CREATE INDEX "assinatura_status_dataFim_idx"
  ON "assinatura"("status", "dataFim");
