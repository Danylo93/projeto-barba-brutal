-- Recuperação de senha. Até aqui, quem esquecia a senha só voltava com
-- suporte manual — o que é insustentável quando começa a haver cliente pagante.

CREATE TABLE IF NOT EXISTS "recuperacao_senha" (
    "id" SERIAL NOT NULL,
    "titularTipo" TEXT NOT NULL,
    "titularId" INTEGER NOT NULL,
    -- Hash do token, nunca o token: quem ler a tabela não consegue usar o link.
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recuperacao_senha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "recuperacao_senha_tokenHash_key" ON "recuperacao_senha"("tokenHash");
CREATE INDEX IF NOT EXISTS "recuperacao_senha_titular_idx" ON "recuperacao_senha"("titularTipo", "titularId");
