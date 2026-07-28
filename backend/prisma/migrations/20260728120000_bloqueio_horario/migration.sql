-- Bloqueio de horário: folga, almoço, férias ou feriado.
-- profissionalId nulo bloqueia a barbearia inteira.
CREATE TABLE "bloqueio" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "profissionalId" INTEGER,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bloqueio_tenantId_inicio_idx" ON "bloqueio"("tenantId", "inicio");
CREATE INDEX "bloqueio_profissionalId_inicio_idx" ON "bloqueio"("profissionalId", "inicio");

ALTER TABLE "bloqueio" ADD CONSTRAINT "bloqueio_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bloqueio" ADD CONSTRAINT "bloqueio_profissionalId_fkey"
    FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
