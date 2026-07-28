-- Prova de consentimento e pedidos de exclusão exigidos pela LGPD.

CREATE TABLE "consentimento_lgpd" (
    "id" SERIAL NOT NULL,
    "titularTipo" TEXT NOT NULL,
    "titularId" INTEGER,
    "tenantId" INTEGER,
    "tipo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "aceito" BOOLEAN NOT NULL,
    "visitanteId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimento_lgpd_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consentimento_lgpd_titularTipo_titularId_idx" ON "consentimento_lgpd"("titularTipo", "titularId");
CREATE INDEX "consentimento_lgpd_visitanteId_idx" ON "consentimento_lgpd"("visitanteId");

CREATE TABLE "solicitacao_exclusao" (
    "id" SERIAL NOT NULL,
    "titularTipo" TEXT NOT NULL,
    "titularId" INTEGER NOT NULL,
    "tenantId" INTEGER,
    "email" TEXT NOT NULL,
    "motivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "observacao" TEXT,
    "atendidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacao_exclusao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "solicitacao_exclusao_status_idx" ON "solicitacao_exclusao"("status");
