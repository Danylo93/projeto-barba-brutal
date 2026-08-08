-- Remove o cupom de desconto.
--
-- A tabela nasceu com o "módulo de marketing" e nunca teve uma linha de código
-- lendo ou escrevendo nela: não havia endpoint, serviço nem tela de verdade —
-- só um estado vazio dizendo "estamos preparando os cupons", enquanto o plano
-- Premium anunciava "Cupons de desconto" como se existisse.
--
-- Conferido em produção antes de derrubar: `SELECT count(*) FROM cupom` = 0.
-- Nenhum dado de barbearia se perde aqui.
--
-- O `IF EXISTS` é para o banco que já não tiver a tabela (ambiente montado
-- depois desta mudança) não travar a migração.

ALTER TABLE IF EXISTS "cupom" DROP CONSTRAINT IF EXISTS "cupom_tenantId_fkey";

DROP TABLE IF EXISTS "cupom";
