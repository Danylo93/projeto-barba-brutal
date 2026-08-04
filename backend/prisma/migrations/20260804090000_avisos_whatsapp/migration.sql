-- Marcas de aviso de WhatsApp no próprio agendamento.
--
-- Antes o controle vivia no Redis, e os dois fluxos do n8n falhavam calados:
--
--   * Lembrete: dedup em `bb:lembrete:{id}` com janela fixa de 60 a 65 minutos.
--     Bastava UMA execução falhar (Redis fora, deploy no meio, Render dormindo)
--     para aqueles agendamentos nunca mais entrarem na consulta. Ninguém era
--     lembrado e não sobrava erro em lugar nenhum.
--   * Confirmação: `bb:marcao:ultimo_agendamento` era avançado ANTES de a
--     mensagem sair. Evolution recusou? Aquele cliente nunca foi avisado. E se
--     o Redis fosse limpo, o marcador voltava a zero e todo mundo da última
--     hora recebia a confirmação de novo.
--
-- Com a marca no banco, o que não saiu continua pendente até sair, e o que saiu
-- não sai duas vezes — mesmo com o Redis inteiro fora do ar.
ALTER TABLE "agendamento" ADD COLUMN "lembreteEnviadoEm" TIMESTAMP(3);
ALTER TABLE "agendamento" ADD COLUMN "confirmacaoEnviadaEm" TIMESTAMP(3);

-- Agendamento que já existe nunca recebe confirmação retroativa: sem este
-- backfill, o primeiro ciclo depois do deploy dispararia "agendamento
-- confirmado!" para todo mundo que marcou recentemente.
UPDATE "agendamento" SET "confirmacaoEnviadaEm" = "createdAt";

-- Mesma ideia para o lembrete, só que a janela é o que importa: quem já está a
-- menos de 65 minutos do horário provavelmente já foi lembrado pelo fluxo
-- antigo — cujo controle vivia no Redis, invisível daqui. Sem isto, a primeira
-- rodada depois do deploy lembraria essas pessoas uma segunda vez.
UPDATE "agendamento"
   SET "lembreteEnviadoEm" = now()
 WHERE "data" <= now() + interval '65 minutes';

-- Índices das duas consultas do fluxo: o que começa adiante e ainda não foi
-- lembrado; o que acabou de ser criado e ainda não foi confirmado.
CREATE INDEX "agendamento_lembrete_idx"
    ON "agendamento" ("data", "lembreteEnviadoEm");

CREATE INDEX "agendamento_confirmacao_idx"
    ON "agendamento" ("createdAt", "confirmacaoEnviadaEm");
