-- Duas recuperações de senha foram para o master ao mesmo tempo e ficaram
-- duas tabelas. Fica a `recuperacao_senha`, que guarda o HASH do token; sai a
-- `token_recuperacao_senha`, que guardava o token em texto puro — quem lesse a
-- tabela (ou um backup vazado) trocava a senha de qualquer conta com pedido
-- aberto.
--
-- A tabela tem poucas horas de vida. Quem tiver um link em aberto dela vai
-- receber "link inválido" e é só pedir de novo.

DROP TABLE IF EXISTS "token_recuperacao_senha";
