-- Preço por profissional: cada barbeiro pode cobrar o próprio valor.
-- Só guarda a exceção; sem linha aqui vale o preço da barbearia (servico.preco).
CREATE TABLE "preco_profissional" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "profissionalId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preco_profissional_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "preco_profissional_profissionalId_servicoId_key"
    ON "preco_profissional"("profissionalId", "servicoId");

CREATE INDEX "preco_profissional_tenantId_idx" ON "preco_profissional"("tenantId");

ALTER TABLE "preco_profissional" ADD CONSTRAINT "preco_profissional_profissionalId_fkey"
    FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "preco_profissional" ADD CONSTRAINT "preco_profissional_servicoId_fkey"
    FOREIGN KEY ("servicoId") REFERENCES "servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Valor congelado no agendamento. Sem isto, o faturamento de junho mudava
-- quando alguém reajustava o preço em agosto.
ALTER TABLE "agendamento" ADD COLUMN "valorTotal" DOUBLE PRECISION;
ALTER TABLE "agendamento" ADD COLUMN "precosServicos" JSONB;

-- Congela o histórico com o preço que está valendo hoje: é a melhor
-- aproximação disponível, e a partir daqui ele para de se mexer sozinho.
UPDATE "agendamento" a
SET "valorTotal" = totais.soma,
    "precosServicos" = totais.mapa
FROM (
    SELECT ags."A" AS agendamento_id,
           SUM(s."preco") AS soma,
           jsonb_object_agg(s."id"::text, s."preco") AS mapa
    FROM "_AgendamentoToServico" ags
    JOIN "servico" s ON s."id" = ags."B"
    GROUP BY ags."A"
) AS totais
WHERE a."id" = totais.agendamento_id;

-- Agendamento sem nenhum serviço vinculado vale zero, e não "desconhecido".
UPDATE "agendamento" SET "valorTotal" = 0, "precosServicos" = '{}'::jsonb
WHERE "valorTotal" IS NULL;
