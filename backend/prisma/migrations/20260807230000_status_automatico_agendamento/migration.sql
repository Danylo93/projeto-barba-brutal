CREATE INDEX "agendamento_tenantId_status_data_idx"
  ON "agendamento"("tenantId", "status", "data");
