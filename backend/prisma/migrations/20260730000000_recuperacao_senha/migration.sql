-- Tabela de tokens de recuperação de senha
CREATE TABLE "token_recuperacao_senha" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiracao" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "token_recuperacao_senha_token_key" ON "token_recuperacao_senha"("token");
CREATE INDEX "token_recuperacao_senha_token_idx" ON "token_recuperacao_senha"("token");