# Lembrete de agendamento no WhatsApp (n8n + Evolution API)

Envia um lembrete no WhatsApp **1 hora antes** de cada agendamento, para o
**cliente** e para o **barbeiro**.

## Como funciona

1. O n8n roda a cada **5 minutos** (Schedule Trigger).
2. Chama o backend `GET /lembretes/proximos?minutosAntes=60&janelaMin=5`
   (com o header `x-lembrete-token`). O backend devolve os agendamentos que
   começam entre 60 e 65 min a partir de agora — assim cada agendamento é
   lembrado uma única vez.
3. Um nó de código monta uma mensagem por destinatário (cliente e barbeiro,
   quando têm telefone).
4. Envia via **Evolution API** (`POST /message/sendText/{instance}`).

## Backend

No serviço do backend, defina a variável de ambiente:

```
LEMBRETE_TOKEN=um-token-secreto-forte
```

Sem essa variável o endpoint fica **desativado** (retorna 503). O endpoint só
responde quando o header `x-lembrete-token` bate com o valor dela.

## n8n — variáveis de ambiente

Defina no n8n (ou nas configurações da instância):

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `BACKEND_URL` | `https://barba-brutal-api.onrender.com` | URL do backend |
| `LEMBRETE_TOKEN` | `um-token-secreto-forte` | Mesmo valor do backend |
| `EVOLUTION_URL` | `https://sua-evolution.com` | URL da sua Evolution API |
| `EVOLUTION_APIKEY` | `sua-apikey` | apikey da instância Evolution |
| `EVOLUTION_INSTANCE` | `barbearia` | Nome da instância no Evolution |

> As expressões `{{ $env.* }}` exigem que o n8n permita acesso a env nos nós
> (padrão na maioria das instâncias self-hosted). Se preferir, troque pelos
> valores fixos ou por Credenciais do n8n.

## Importar

1. n8n → **Workflows** → **Import from File** → selecione
   `lembrete-whatsapp-evolution.json`.
2. Confira as variáveis acima.
3. Faça um teste manual no nó "Buscar agendamentos" e depois **ative** o
   workflow.

## Formato dos telefones

O backend devolve o telefone como está cadastrado (ex.: `11999999999`); o nó de
código normaliza para o formato do WhatsApp com DDI (`5511999999999`).
Garanta que clientes e barbeiros tenham telefone cadastrado.
