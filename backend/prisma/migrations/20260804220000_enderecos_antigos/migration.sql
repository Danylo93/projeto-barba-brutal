-- Endereços que a barbearia já teve.
--
-- O slug (`tenant.dominio`) passa a ser o subdomínio público
-- (`latita.barbeariabrutal.com`). Trocá-lo deixaria de ser um detalhe de URL e
-- passaria a quebrar QR code impresso, link na bio do Instagram e cartão de
-- visita já entregue. Guardando os antigos, a página pública ainda encontra a
-- barbearia pelo endereço velho e manda para o novo.
ALTER TABLE "tenant" ADD COLUMN "dominiosAntigos" TEXT[] NOT NULL DEFAULT '{}';

-- A consulta da página pública procura aqui quando não acha em `dominio`.
CREATE INDEX "tenant_dominios_antigos_idx" ON "tenant" USING GIN ("dominiosAntigos");
