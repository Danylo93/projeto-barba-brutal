-- Lembrete para o cliente voltar depois de realizar um serviço.
-- É uma automação diferente do lembrete de uma hora antes do agendamento.
ALTER TABLE "agendamento" ADD COLUMN "retornoEnviadoEm" TIMESTAMP(3);

-- A rotina procura atendimentos concluídos, vencidos pelo intervalo escolhido
-- e ainda sem envio. O índice evita varrer todo o histórico a cada execução.
CREATE INDEX "agendamento_retorno_idx"
    ON "agendamento" ("tenantId", "status", "data", "retornoEnviadoEm");
