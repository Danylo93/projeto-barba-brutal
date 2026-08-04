-- Preço é da barbearia, não do barbeiro: existe um preço por serviço
-- (`servico.preco`) e pronto.
--
-- `agendamento.valorTotal` e `agendamento.precosServicos` FICAM: congelar o
-- valor no ato do agendamento não tem a ver com quem define o preço. Sem eles,
-- reajustar um corte hoje reescreve o faturamento e a comissão dos meses
-- passados, que é um problema independente.
DROP TABLE IF EXISTS "preco_profissional";
