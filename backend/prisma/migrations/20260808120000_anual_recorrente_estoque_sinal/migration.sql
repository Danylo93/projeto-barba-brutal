-- Plano anual: a periodicidade fica explícita e o `grupo` liga a versão
-- mensal à anual do mesmo plano.
ALTER TABLE "plano"
  ADD COLUMN "periodicidade" TEXT NOT NULL DEFAULT 'mensal',
  ADD COLUMN "grupo" TEXT;

-- Os planos que já existem são todos mensais; o grupo sai do nome.
UPDATE "plano" SET "grupo" = lower("nome") WHERE "grupo" IS NULL;

-- Sinal no agendamento e agendamento sem conta: configuração da barbearia.
ALTER TABLE "tenant"
  ADD COLUMN "sinalAtivo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sinalPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "sinalMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "sinalPrazoMinutos" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "agendamentoSemConta" BOOLEAN NOT NULL DEFAULT true;

-- Conta nascida de agendamento sem cadastro.
ALTER TABLE "usuario"
  ADD COLUMN "semCadastro" BOOLEAN NOT NULL DEFAULT false;

-- Atendimento recorrente.
CREATE TABLE "serie_agendamento" (
  "id"             SERIAL       NOT NULL,
  "tenantId"       INTEGER      NOT NULL,
  "usuarioId"      INTEGER      NOT NULL,
  "profissionalId" INTEGER      NOT NULL,
  "servicoIds"     INTEGER[],
  "frequencia"     TEXT         NOT NULL,
  "diaSemana"      INTEGER      NOT NULL,
  "hora"           TEXT         NOT NULL,
  "geradoAte"      TIMESTAMP(3),
  "ate"            TIMESTAMP(3),
  "ativo"          BOOLEAN      NOT NULL DEFAULT true,
  "observacoes"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "serie_agendamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "serie_agendamento_tenantId_ativo_idx"
  ON "serie_agendamento"("tenantId", "ativo");

ALTER TABLE "serie_agendamento"
  ADD CONSTRAINT "serie_agendamento_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "serie_agendamento_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "serie_agendamento_profissionalId_fkey"
    FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sinal e vínculo com a série, no próprio agendamento.
ALTER TABLE "agendamento"
  ADD COLUMN "sinalValor"         DOUBLE PRECISION,
  ADD COLUMN "sinalStatus"        TEXT,
  ADD COLUMN "sinalPixCopiaECola" TEXT,
  ADD COLUMN "sinalExpiraEm"      TIMESTAMP(3),
  ADD COLUMN "sinalPagoEm"        TIMESTAMP(3),
  ADD COLUMN "serieId"            INTEGER;

CREATE INDEX "agendamento_sinalStatus_sinalExpiraEm_idx"
  ON "agendamento"("sinalStatus", "sinalExpiraEm");
CREATE INDEX "agendamento_serieId_idx" ON "agendamento"("serieId");

ALTER TABLE "agendamento"
  ADD CONSTRAINT "agendamento_serieId_fkey"
    FOREIGN KEY ("serieId") REFERENCES "serie_agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Produtos e estoque.
CREATE TABLE "produto" (
  "id"            SERIAL           NOT NULL,
  "tenantId"      INTEGER          NOT NULL,
  "nome"          TEXT             NOT NULL,
  "descricao"     TEXT,
  "precoVenda"    DOUBLE PRECISION NOT NULL,
  "precoCusto"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "estoque"       INTEGER          NOT NULL DEFAULT 0,
  "estoqueMinimo" INTEGER          NOT NULL DEFAULT 0,
  "imagemUrl"     TEXT             NOT NULL DEFAULT '',
  "ativo"         BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "produto_nome_tenantId_key" ON "produto"("nome", "tenantId");
CREATE INDEX "produto_tenantId_ativo_idx" ON "produto"("tenantId", "ativo");

ALTER TABLE "produto"
  ADD CONSTRAINT "produto_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "movimento_estoque" (
  "id"            SERIAL           NOT NULL,
  "tenantId"      INTEGER          NOT NULL,
  "produtoId"     INTEGER          NOT NULL,
  "tipo"          TEXT             NOT NULL,
  "quantidade"    INTEGER          NOT NULL,
  "saldoDepois"   INTEGER          NOT NULL,
  "valorUnitario" DOUBLE PRECISION,
  "motivo"        TEXT,
  "usuarioId"     INTEGER,
  "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "movimento_estoque_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "movimento_estoque_tenantId_createdAt_idx"
  ON "movimento_estoque"("tenantId", "createdAt");
CREATE INDEX "movimento_estoque_produtoId_createdAt_idx"
  ON "movimento_estoque"("produtoId", "createdAt");

ALTER TABLE "movimento_estoque"
  ADD CONSTRAINT "movimento_estoque_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "movimento_estoque_produtoId_fkey"
    FOREIGN KEY ("produtoId") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
