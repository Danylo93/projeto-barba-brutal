# WhatsApp (n8n + Evolution API)

Cinco fluxos, um trabalho cada:

| Arquivo | O que faz | Quando roda |
|---|---|---|
| `barbabrutal1confirmacaoagendamento.json` | Ao **criar** um agendamento, avisa cliente e barbeiro | a cada 1 min |
| `barbabrutal2lembrete1h.json` | **1 hora antes** do horário, lembra cliente e barbeiro | a cada 5 min |
| `barbabrutal3lembrete-retorno.json` | Lembra o cliente de **refazer um serviço concluído** | todo dia às 10h |
| `barbabrutal4avisos-plano.json` | Avisa a barbearia **1 dia antes e quando o plano expira**, por WhatsApp e e-mail | a cada hora |
| `Barbearia Brutal — atendente de WhatsApp.json` | **Atende** o cliente: marca, remarca e cancela pela conversa | a cada mensagem |

Os quatro primeiros falam; o quinto conversa. Este README cobre os cinco, e o
atendente tem uma seção própria mais abaixo.

Os quatro automáticos têm dois nós de trabalho: um relógio e uma chamada HTTP. **Quem busca,
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

### Atendente de WhatsApp (o agente de IA)

A barbearia sai da **instance da Evolution**, nunca do `?tenantId=` da URL. A
instance já é única por barbearia, o dono configura no painel dele, e ela chega
no fluxo pelo webhook da própria Evolution — ninguém digita.

Por isso **barbearia nova não pede variável nem deploy**: basta o dono
configurar a instance dele.

| Variável | Quando usar |
|---|---|
| `WHATSAPP_BOT_TOKEN` | um token para o n8n do SaaS; a instance diz de quem é a conversa |
| `WHATSAPP_BOT_TOKENS` | um token por barbearia (`{"1":"tok-um"}`), quando se quer isolar de verdade |

**O atendente só funciona nos planos Profissional e Premium.** Quem estiver
fora deles — ou com a assinatura vencida — recebe `403` em toda rota do bot.
Antes não havia checagem nenhuma: bastava configurar a instance para o robô
atender em qualquer plano.

### De qual número sai a mensagem

Cada barbearia envia pela instância da Evolution dela, guardada em
`tenant.configuracoes.evolutionInstance`. Quem não tiver uma configurada cai no
`EVOLUTION_INSTANCE` do backend.

Isso importa porque o disparo atende **todas** as barbearias numa batida só:
sem essa resolução, o cliente da Latita receberia o lembrete pelo WhatsApp de
outra barbearia — e responderia para o número errado.

### No n8n

Uma credencial, e nada de variável de ambiente:

- Tipo: **Header Auth**
- Name: `x-lembrete-token`
- Value: o mesmo valor do `LEMBRETE_TOKEN` do backend

A URL da API está escrita no nó de disparo. Foi por aí em vez de `$env.*`
porque as *Variables* do n8n são recurso pago, e credencial é melhor de
qualquer jeito: o valor não viaja no JSON exportado nem vai para o repositório.

---

## Importar e ativar

1. n8n → **Workflows** → **Import from File** → selecione os quatro fluxos automáticos `.json`.
2. Vincule a credencial **Token do lembrete** (Header Auth). Não há credencial
   de Postgres nem de Redis.
3. Teste manual no nó de disparo: deve responder um resumo como
   `{ "tipo": "lembrete", "enviados": 0, "falhas": 0, "marcados": 0, "pendentes": 0, "semTelefone": [] }`.
4. **Ative** os quatro.

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
| `POST /lembretes/retorno/disparar` | processa os retornos configurados em 15, 20, 30 ou 40 dias; disponível em todos os planos |
| `POST /assinaturas/avisos-expiracao/disparar` | envia por WhatsApp e e-mail o aviso da véspera e o da expiração; cada canal tem deduplicação própria |
| `GET /lembretes/proximos` | só lê: pendentes de lembrete, com as mensagens já montadas |
| `GET /lembretes/confirmacoes` | só lê: pendentes de confirmação |
| `POST /lembretes/enviados` | marca ids de lembrete (`{ "ids": [1,2] }`) |
| `POST /lembretes/confirmacoes/enviadas` | marca ids de confirmação |

Os quatro últimos existem para quem precisa enviar por fora do backend. Quem
enviar assim **é obrigado a marcar** — sem a marca, o mesmo agendamento volta
na rodada seguinte e o cliente recebe de novo.

### As ferramentas do atendente

Todas exigem o header `x-whatsapp-token` e `?instance=` — é a instance que diz
de qual barbearia é a conversa.

| Rota | O que faz |
|---|---|
| `GET /whatsapp/agenda/catalogo` | serviços (com preço e duração) e profissionais |
| `GET /whatsapp/agenda/horarios` | **horários livres** de um dia: `?data=&profissionalId=&servicos=` |
| `GET /whatsapp/agenda/agendamentos` | o que aquele telefone tem marcado |
| `POST /whatsapp/agenda/agendamentos` | marca |
| `PATCH /whatsapp/agenda/agendamentos/:id/reagendar` | remarca |
| `POST /whatsapp/agenda/agendamentos/:id/cancelar` | cancela |

`horarios` é o que separa um atendente de um chute. Sem ele o agente propunha
horário no escuro, tomava recusa, e o cliente ouvia uma negativa atrás da outra
sem nunca receber uma opção.

---

## O atendente

### Como ele conversa

Um agente de IA com seis ferramentas — o cardápio, os horários livres, e as
quatro ações da agenda. Ele não decide regra nenhuma: **quem aceita ou recusa é
a API**, e o agente traduz. O prompt segura o tom (português informal, frase
curta, nunca diz que é um robô) e proíbe inventar preço, horário ou nome de
barbeiro.

### A recusa é metade do atendimento

Quando não dá para remarcar, o cliente precisa saber **por quê** e **o que
fazer agora**. O backend devolve a frase pronta, cada caso com a sua:

| Situação | O que o cliente lê |
|---|---|
| horário de hoje que já passou | "Esse horário de hoje já passou — agora são 17:00. Me diz um horário mais tarde de hoje ou outro dia…" |
| dia que já passou | "Esse dia já passou. Me diz uma data de hoje em diante…" |
| menos de 15 min de antecedência | "…só consigo marcar com pelo menos 15 minutos de antecedência. Escolhe um horário a partir das 17:15" |
| dia em que a barbearia não abre | "A barbearia não abre domingo. Escolha outro dia." |
| fora do expediente | "Nesse dia a barbearia atende das 09h às 18h." |
| horário já ocupado | "Este profissional já tem um atendimento às 11:00." |
| folga do barbeiro | "O profissional não está disponível neste horário (almoço)." |
| mesmo horário que já era o dele | "Esse já é o horário do seu agendamento (13/08 às 16:30)." |
| agendamento cancelado | "Esse agendamento foi cancelado… Quer que eu marque um horário novo?" |
| agendamento concluído | "Esse atendimento já foi realizado." |
| serviço saiu do cardápio | "Um dos serviços desse agendamento saiu do nosso cardápio." |
| barbeiro desligado | "Esse profissional não está mais atendendo aqui. Quer marcar com outro?" |
| agendamento de outra pessoa | "Não encontrei esse agendamento no seu nome." |

Todas as ferramentas do agente estão em `neverError`: a recusa volta **para o
agente** como corpo da resposta em vez de derrubar a execução. Sem isso a
execução morre vermelha e o cliente não recebe nada — que era exatamente o que
acontecia.

### Fuso

O cliente diz "15h" pensando em Brasília. O servidor no Render está em UTC.
Data sem fuso agora é lida como horário de Brasília: antes as 15h viravam
meio-dia, com a API respondendo `200` e o cliente recebendo a confirmação de um
horário que ele nunca pediu.

### O que trocar antes de ativar

1. Credencial **Header Auth** — Name `x-whatsapp-token`, Value **exatamente
   igual** ao `WHATSAPP_BOT_TOKEN` do Render. Uma só credencial faz os três
   papéis: porteiro do webhook, as seis ferramentas e o envio da resposta.

   Se o valor não bater com o do Render, a conversa vai até o fim e morre no
   último passo: o backend responde `401 Token do WhatsApp inválido.` e o
   cliente não recebe nada. Foi assim que ficou depois de tudo consertado.

   Nada de credencial da Evolution aqui: quem fala com ela é o backend, que já
   tem a URL, a apikey e a instância da barbearia. O nó **Responder no
   WhatsApp** chama `POST /whatsapp/agenda/responder`, não a Evolution.
2. Credencial do **modelo** — Anthropic. A chave sai de
   [console.anthropic.com](https://console.anthropic.com) e vai na credencial
   `Anthropic` do n8n, vinculada ao nó **Modelo**.

   O fluxo vem com `claude-haiku-4-5`. Se o modelo que você quiser não
   aparecer na lista do nó, troque o campo para **By ID** e digite o nome: o
   n8n lê o catálogo da Anthropic, e um nó desatualizado pode ter a lista
   velha.

   Trocar de modelo é mexer num campo só. O que muda:

   | Modelo | Quando |
   |---|---|
   | `claude-haiku-4-5` | o que está no arquivo — o mais barato e rápido, suficiente para agendamento |
   | `claude-sonnet-5` | melhor em pedido confuso; a troca a fazer se o Haiku começar a se atrapalhar |
   | `claude-opus-5` | o mais capaz; segura conversa torta sem perder o fio, e é o mais caro |

   O atendimento é conversa curta com ferramenta fazendo o trabalho pesado — o
   modelo decide o que chamar e escreve a resposta, não inventa regra. Por isso
   o padrão é o Haiku. Suba quando aparecer o cliente que escreve "não vai dar
   pra sexta, tem alguma coisa antes?" e a resposta vier torta.

   Uma coisa o Haiku faz e o prompt teve que proibir com todas as letras:
   responder sobre serviço e preço **de cabeça**, sem chamar o `cardapio`.
   Numa execução real ele inventou "corte, barba e acabamento" sem consultar
   nada. O bloco *VOCÊ NÃO SABE NADA DESTA BARBEARIA DE CABEÇA* existe por
   causa disso — se você trocar o prompt, não tire.
3. Na Evolution, aponte o webhook `messages.upsert` para a URL de produção do
   fluxo — ou, melhor, deixe o dono apertar **conectar** no painel: o backend
   registra o webhook com o header certo sozinho.
4. **Publique.** No n8n novo, salvar não ativa: o rascunho fica salvo e a
   produção continua rodando a versão publicada antiga. Foi assim que um fluxo
   já corrigido seguiu servindo a versão quebrada por horas, com o editor
   mostrando o código certo.

### Por que a versão anterior foi jogada fora

Ela não era um agente: era um roteador de intenção por expressão regular. E
estava morta havia tempo — os `\b` do código viraram **caractere de backspace**
ao entrar no JSON, então nenhuma regra casava e **toda** mensagem caía no texto
de ajuda. Ninguém conseguia marcar, cancelar nem remarcar pelo WhatsApp, e não
sobrava erro em lugar nenhum. Junto com isso:

- o id do agendamento era "o primeiro número da frase" — *"remarcar para as
  15:00"* virava agendamento nº 15;
- a data `2026-08-06` estava escrita à mão no código, então quem dissesse só a
  hora era mandado para aquele dia, para sempre;
- o nó de resposta dizia "reagendado com sucesso" sem olhar o que a API
  respondeu;
- o envio pela Evolution ia com o token do backend no lugar da apikey, então
  nenhuma resposta chegava ao cliente;
- e os três `$env.*` não funcionam sem as *Variables* pagas do n8n.

O teste `backend/src/whatsapp/fluxos-n8n.spec.ts` roda junto com o resto e
recusa esses padrões — caractere de controle escondido, data fixa, credencial
faltando, `$env.`, endereço de exemplo, ferramenta que morre na recusa e o tipo
de ferramenta que não roda (abaixo).

### E o que ainda faltava depois disso

Mesmo com o fluxo reescrito, nenhum cliente era atendido. Três motivos, todos
mudos:

1. **O rascunho nunca virou versão ativa.** As correções estavam salvas e o
   editor mostrava o código certo, mas a produção rodava a versão publicada
   anterior — a do agente na typeVersion errada.
2. **As seis ferramentas eram `@n8n/n8n-nodes-langchain.toolHttpRequest`.**
   Esse tipo só tem `supplyData`; o motor executa ferramenta pelo caminho
   normal de nó, que exige `execute`. Toda chamada morria com *"has a
   supplyData method but no execute method"* — e como a ferramenta estava em
   `continueRegularOutput`, esse texto de erro voltava para o modelo **como se
   fosse a resposta da API**. Ele respondia por cima: um cliente ouviu que não
   tinha agendamento nenhum enquanto tinha. Agora são
   `n8n-nodes-base.httpRequestTool`.
3. **O nó de resposta usava a credencial da Evolution.** Ele fala com o nosso
   backend, que quer `x-whatsapp-token`; ia com o nome da credencial no lugar
   do nome do header e morria em `ERR_INVALID_HTTP_TOKEN`.

### Por que não há mais nó de Code

Code node do n8n não roda no processo principal: vai para o **task runner**.
Quando o runner caiu na VPS, o atendimento inteiro ficou pendurado até estourar
— inclusive o caminho do áudio, que nem passa pelo agente. O que os três Code
faziam hoje é feito por `Set` e `If`, que rodam no processo principal e não
dependem de runner nenhum.

Com isso o fluxo perdeu a única expressão regular perigosa que restava: onde
havia `/\D/g` (o `\b` primo desse foi quem matou a versão de intenção), agora
há `/[^0-9]/g`, que atravessa JSON sem escape.

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
