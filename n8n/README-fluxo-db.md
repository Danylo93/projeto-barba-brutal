# Fluxo WhatsApp direto no banco (n8n + PostgreSQL + Redis + Evolution API)

Dois workflows que leem os agendamentos **direto do banco** e enviam WhatsApp
pela **Evolution API** — usando a mesma stack do seu servidor
(PostgreSQL 5432, Redis 6379, Evolution :8080).

| Arquivo | O que faz | Frequência |
|---------|-----------|------------|
| `barbabrutal-1-confirmacao-agendamento.json` | Ao **criar** um agendamento, avisa **cliente e barbeiro** | a cada 1 min |
| `barbabrutal-2-lembrete-1h.json` | **1 hora antes** do horário (Brasília), lembra **cliente e barbeiro** | a cada 5 min |

Ambos usam **tenant 1 = Barbearia do Marcão**. Para outra barbearia, troque
`a."tenantId" = 1` na consulta do nó Postgres.

---

## 1) Telefones de teste (Barbearia do Marcão)

O fluxo lê o telefone **do banco**. Os números de teste:

| Papel | Nome | WhatsApp |
|-------|------|----------|
| Barbeiro | Marcão | `5511915036789` |
| Cliente | João | `5511964891128` |

- **Produção:** já entram pela migração `20260723100000_telefones_teste_whatsapp`
  (roda no deploy do Render).
- **Banco local/próprio:** rode `setup-teste-telefones.sql` no mesmo banco do backend.

> Os números são salvos com **DDI 55**. O fluxo também normaliza qualquer telefone
> para `55...` automaticamente, então cadastros novos funcionam mesmo sem o 55.

---

## 2) Variáveis de ambiente no n8n

Defina no n8n (Settings → Variables, ou variáveis de ambiente da instância):

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `EVOLUTION_URL` | `http://evolutionapi:8080` | URL da sua Evolution API |
| `EVOLUTION_APIKEY` | `sua-apikey` | apikey da instância (header `apikey`) |
| `EVOLUTION_INSTANCE` | `barbearia` | nome da instância no Evolution |

> Endpoint usado: `POST {EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCE}`
> com header `apikey` e corpo `{ "number": "...", "text": "..." }` (Evolution **v2**).

---

## 3) Credenciais no n8n

Ao importar, o n8n vai pedir para vincular duas credenciais:

- **Postgres Barbearia Brutal** → aponte para o **mesmo banco do backend**
  (o do `DATABASE_URL`). Em produção é o Neon; localmente é o seu Postgres 5432.
- **Redis Barbearia Brutal** → seu Redis (6379). Usado para não duplicar envios.

---

## 4) Importar e ativar

1. n8n → **Workflows** → **Import from File** → selecione os dois `.json`.
2. Vincule as credenciais Postgres e Redis e confira as variáveis do Evolution.
3. Faça um **teste manual** no nó "Buscar…": deve listar agendamentos.
4. **Ative** os dois workflows.

---

## 5) Como testar ponta a ponta

1. Aplique os telefones (item 1).
2. No sistema, logado como o cliente **João** (`joao@barbeariadomarcao.app`),
   faça um agendamento com o **Marcão** para **daqui a ~1h10min**.
3. Em até 1 min → chega a **confirmação** no WhatsApp do João e do Marcão.
4. Quando faltar 1 hora → chega o **lembrete** para os dois.

> Dica: para ver o lembrete rápido sem esperar, agende para daqui a ~1h02min —
> ele entra na janela de 60–65 min do próximo ciclo de 5 min.

---

## Como funciona (resumo técnico)

**Confirmação:** guarda no Redis o id do último agendamento processado
(`bb:marcao:ultimo_agendamento`); a cada minuto busca `id > último` criados na
última hora e dispara as mensagens, atualizando o marcador.

**Lembrete:** busca agendamentos que começam entre **60 e 65 min** a partir de
agora (comparação por instante absoluto, então o fuso não afeta a janela); o
horário exibido é formatado em **America/Sao_Paulo**. Cada agendamento é marcado
no Redis (`bb:lembrete:{id}`, TTL 2h) para não repetir o lembrete.
