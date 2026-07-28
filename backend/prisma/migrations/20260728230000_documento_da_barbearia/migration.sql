-- CPF ou CNPJ como identificador único da barbearia.
-- Sem isso, a mesma pessoa abre conta atrás de conta com e-mails diferentes
-- (nenhum verificado) e renova o teste grátis para sempre.

ALTER TABLE "tenant" ADD COLUMN "documento" TEXT;
ALTER TABLE "tenant" ADD COLUMN "tipoDocumento" TEXT;

-- Aproveita o que já havia em cnpj: só dígitos, e só quando tem 14 posições.
UPDATE "tenant"
SET "documento" = regexp_replace("cnpj", '[^0-9]', '', 'g'),
    "tipoDocumento" = 'cnpj'
WHERE "cnpj" IS NOT NULL
  AND length(regexp_replace("cnpj", '[^0-9]', '', 'g')) = 14;

-- Índice único parcial: várias barbearias antigas ainda estão sem documento,
-- e NULL não colide com NULL no Postgres — só os preenchidos são checados.
CREATE UNIQUE INDEX "tenant_documento_key" ON "tenant"("documento");
