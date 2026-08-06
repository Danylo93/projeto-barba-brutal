-- O robô de WhatsApp passa a valer também no plano Profissional.
--
-- Até aqui a frase "Robô de WhatsApp" só aparecia no Premium, e o backend não
-- conferia plano nenhum: qualquer barbearia com a instância da Evolution
-- configurada era atendida pelo robô, inclusive no plano mais barato e
-- inclusive com assinatura vencida. Agora o backend confere — e a vitrine
-- precisa dizer a verdade para quem contrata o Profissional.

UPDATE "plano"
SET "features" = array_append("features", 'Robô de WhatsApp')
WHERE lower("nome") = 'profissional'
  AND NOT ('Robô de WhatsApp' = ANY("features"));
