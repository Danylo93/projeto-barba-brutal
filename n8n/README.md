# Avisos de WhatsApp (n8n + Evolution API)

Dois fluxos, um trabalho cada:

| Arquivo | O que faz | Frequência |
|---|---|---|
| `barbabrutal-1-confirmacao-agendamento.json` | Ao **criar** um agendamento, avisa cliente e barbeiro | a cada 1 min |
| `barbabrutal-2-lembrete-1h.json` | **1 hora antes** do horário, lembra cliente e barbeiro | a cada 5 min |

O arquivo `../Fluxo_WhatsApp_Barbearia_Premium.json` é o fluxo de entrada:
recebe o webhook `messages.upsert` da Evolution, conversa com o cliente e usa
somente a API do backend para consultar, criar, cancelar ou reagendar. Ele não
grava mais diretamente no Postgres, portanto todas as mesmas validações do
aplicativo também valem no WhatsApp.

Os dois têm dois nós de trabalho: um relógio e uma chamada HTTP. **Quem busca,
monta a mensagem, envia pela Evolution e marca o que saiu é o backend.**

---

## Por que o n8n virou só o relógio

A versão anterior fazia tudo dentro do n8n: lia o banco pelo nó de Postgres,
guardava o controle no Redis e montava a mensagem num nó de código. Três coisas
davam errado em silêncio:

1. **Lembrete com janela de 5 minutos.** A consulta era
   `data >= agora+60min AND data < agora+65min`. Bastava **uma** execução falhar
   — Redis fora, deploy no meio, o Render dormindo — para aqueles agendamentos
   nunca mais entrarem na consulta. Ninguém era lembrado e não sobrava erro em
   lugar nenhum.
2. **Confirmação marcada antes de enviar.** O id do último agendamento
   processado era gravado no Redis **antes** de a mensagem sair. Evolution
   recusou? Aquele cliente nunca foi avisado. E se o Redis fosse limpo, o
   marcador voltava a zero e todo mundo da última hora recebia de novo.
3. **Sem filtro de barbearia.** A consulta varria o banco inteiro. Um único
   token de fluxo dava a agenda e o telefone dos clientes de todas as
   barbearias.

Hoje o controle é uma coluna do agendamento (`lembreteEnviadoEm` e
`confirmacaoEnviadaEm`), gravada **só depois** de a Evolution aceitar. O que
falhou continua pendente e sai na rodada seguinte, sozinho. E o Redis saiu de
cena: não há mais um segundo lugar onde a verdade possa divergir do banco.

Efeito colateral bem-vindo: o n8n não precisa mais da senha do banco nem da
apikey da Evolution. As duas ficam só no backend.

---

## Variáveis de ambiente

### No backend (Render)

| Variável | Descrição |
|---|---|
| `LEMBRETE_TOKEN` | Segredo que o n8n manda no header `x-lembrete-token`. **Sem ela os endpoints ficam desativados** e respondem 503. |
| `EVOLUTION_URL` | URL da Evolution API, alcançável pela internet (ex.: `https://evolution.seudominio.com`) |
| `EVOLUTION_APIKEY` | apikey da instância |
| `EVOLUTION_INSTANCE` | nome da instância conectada ao número |

> A Evolution precisa estar acessível **de fora**, porque quem chama agora é o
> backend no Render, não o n8n. Se ela só responde dentro da rede do seu
> servidor (`http://evolutionapi:8080`), publique-a atrás de HTTPS antes de
> ativar os fluxos. Sem as três variáveis, o disparo responde **503 com a
> mensagem do que falta** — de propósito: marcar como enviado sem ter enviado
> tiraria o agendamento da fila sem ninguém ser avisado.

### No n8n

| Variável | Exemplo |
|---|---|
| `BACKEND_URL` | `https://barba-brutal-api.onrender.com` |
| `LEMBRETE_TOKEN` | mesmo valor do backend |

Para o fluxo **Assistente IA WhatsApp**, configure também:

| Variável | Descrição |
|---|---|
| `WHATSAPP_BOT_TOKEN` | segredo global do bot do WhatsApp, usado pelo fluxo para falar com o backend |

No backend, o webhook do WhatsApp agora resolve a barbearia automaticamente
pela `instance` da Evolution, lida da configuração do tenant
(`configuracoes.evolutionInstance` ou campos equivalentes). O fluxo n8n não
precisa mais de `WHATSAPP_TENANT_ID` fixo: ele chama `GET /whatsapp/agenda/resolver`
com a `instance` recebida no webhook, obtém `tenantId` e `tenantNome`, e então
segue para catálogo, criação, cancelamento e reagendamento.

Se você quiser manter compatibilidade com a instalação antiga, o backend ainda
aceita `WHATSAPP_BOT_TOKENS` como mapa por tenant, mas o caminho recomendado é
usar um `WHATSAPP_BOT_TOKEN` global no n8n e deixar a barbearia ser descoberta
automaticamente pela `instance`.

---

## Importar e ativar

1. n8n → **Workflows** → **Import from File** → selecione os dois `.json`.
2. Confira as duas variáveis acima. **Não há credencial para vincular** — nem
   Postgres, nem Redis.
3. Teste manual no nó de disparo: deve responder um resumo como
   `{ "tipo": "lembrete", "enviados": 0, "falhas": 0, "marcados": 0, "pendentes": 0, "semTelefone": [] }`.
4. **Ative** os dois.

> Se você tinha a versão anterior importada, **desative os fluxos antigos**
> antes de ativar estes. Os dois rodando juntos mandam a mensagem em dobro.

---

## Ler a execução

O nó de disparo devolve o resumo da rodada:

| Campo | O que significa |
|---|---|
| `enviados` | mensagens que a Evolution aceitou (cliente e barbeiro contam separado) |
| `falhas` | mensagens recusadas — **voltam na próxima rodada** |
| `marcados` | agendamentos concluídos (só marca quando a mensagem do **cliente** saiu) |
| `pendentes` | o que sobrou para a próxima rodada |
| `semTelefone` | clientes sem telefone utilizável — esses **nunca** vão receber |

O nó **"Algo para olhar?"** separa a rodada que teve falha ou cliente sem
telefone, para você achar na lista de execuções sem abrir uma por uma.

Falha de rede ou 503 deixa a execução **vermelha** — é para ser barulhento. O
agendamento não se perde: continua pendente até sair.

---

## Telefones

O backend só envia para número que a Evolution consegue entregar: 10 dígitos ou
mais com DDD, com o `55` posto na frente quando falta. Quem não tem telefone
utilizável sai da fila, entra em `semTelefone` e vira aviso no log — antes o
envio falhava lá na ponta, calado, e o dono nunca ficava sabendo.

Telefones de teste da Barbearia do Marcão (barbeiro `5511915036789`, cliente
`5511964891128`) já entram pela migração `20260723100000_telefones_teste_whatsapp`.
Em banco local, rode `setup-teste-telefones.sql`.

---

## Endpoints

Todos exigem o header `x-lembrete-token`. `?tenantId=` recorta numa barbearia
só; sem ele, vale para todas.

| Rota | O que faz |
|---|---|
| `POST /lembretes/disparar` | busca, envia e marca os lembretes. `?minutosAntes=60&janelaMin=5&limite=60` |
| `POST /lembretes/confirmacoes/disparar` | o mesmo, para as confirmações |
| `GET /lembretes/proximos` | só lê: pendentes de lembrete, com as mensagens já montadas |
| `GET /lembretes/confirmacoes` | só lê: pendentes de confirmação |
| `POST /lembretes/enviados` | marca ids de lembrete (`{ "ids": [1,2] }`) |
| `POST /lembretes/confirmacoes/enviadas` | marca ids de confirmação |

Os quatro últimos existem para quem precisa enviar por fora do backend. Quem
enviar assim **é obrigado a marcar** — sem a marca, o mesmo agendamento volta
na rodada seguinte e o cliente recebe de novo.

---

## Testar ponta a ponta

1. Logado como o cliente João (`joao@barbeariadomarcao.app`), agende com o
   Marcão para daqui a **~1h10min**.
2. Em até 1 minuto chega a **confirmação** para os dois.
3. Quando faltar 1 hora chega o **lembrete**.

Para não esperar, chame o disparo do lembrete com a antecedência aumentada:

```bash
curl -X POST "$BACKEND_URL/lembretes/disparar?minutosAntes=180" \
     -H "x-lembrete-token: $LEMBRETE_TOKEN"
```
