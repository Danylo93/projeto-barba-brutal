-- Marca serviços já existentes com "combo" no nome como combo (ehCombo = true),
-- para a regra de seleção exclusiva do agendamento valer sem edição manual.
-- Migração de dados separada, sem alterar a migração anterior já aplicada.
UPDATE "servico" SET "ehCombo" = true WHERE lower("nome") LIKE '%combo%';
