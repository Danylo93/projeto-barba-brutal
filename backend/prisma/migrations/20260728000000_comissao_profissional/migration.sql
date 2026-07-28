-- Comissão do profissional: percentual do valor do serviço que fica com ele.
-- Padrão 0 = sem comissão configurada (o dono define no cadastro).
ALTER TABLE "profissional" ADD COLUMN "comissaoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
