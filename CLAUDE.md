# Barbearia Brutal

SaaS multi-tenant de agendamento para barbearias. Cada barbearia tem sua página, seus
profissionais, seus serviços e seus clientes; o admin do SaaS acompanha tudo por fora.

- `backend/` — NestJS + Prisma + PostgreSQL (Neon). Deploy no Render.
- `frontend/` — Next 14 App Router + Tailwind. Deploy na Vercel.
- `n8n/` — fluxos de WhatsApp (confirmação de agendamento e lembrete de 1h antes).

## Especialistas do projeto

Este repositório tem quatro subagentes em `.claude/agents/`. **Acione o especialista
correspondente sempre que o pedido cair na área dele** — antes de dar a tarefa por
concluída, não depois que o usuário reclamar:

| Área do pedido | Agente |
|---|---|
| Antes de commitar, abrir PR ou dizer "está pronto" | `revisor-codigo` |
| Mexeu em tela, layout, componente ou responsividade | `designer` |
| Texto que alguém vai ler: landing, WhatsApp, e-mail, anúncio, erro, botão | `copywriter` |
| n8n, WhatsApp, lembrete, Redis, migration, deploy, credencial | `especialista-automacao` |

Quando o usuário disser que algo "não está funcionando", "está zuado" ou "quebrou",
chame o especialista da área para **verificar de verdade** em vez de responder de
memória. Mais de um pode ser acionado no mesmo pedido — uma tela nova costuma
precisar de `designer` e `revisor-codigo`.

## Comandos

```bash
cd backend  && npx jest              # testes (49 hoje)
cd backend  && npx tsc --noEmit
cd frontend && npx tsc --noEmit
cd frontend && npm run build
cd frontend && npx next start -p 3500   # build de produção, apontando para a API real
```

Se a porta 3500 estiver ocupada, mate o processo antes (`ps aux | grep "[n]ext-server"`):
rodar `next start` sobre um `.next` recém-reconstruído serve o build antigo.

## Contas de teste (produção)

Senha `#Senha123` em todas.

| Papel | E-mail | Login |
|---|---|---|
| Dono | `contato@barbeariadomarcao.app` | `/login` |
| Cliente | `joao@barbeariadomarcao.app` | `/login?tenant=1` |
| Barbeiro | `marcao@barbeariadomarcao.app` | `/login?tenant=1` |

API de produção: `https://barba-brutal-api.onrender.com`

## Convenções

**Código e comentários em português.** Nomes de variável, função e mensagem de commit
também. Comentário explica o *porquê*, não o *o quê*.

**Multi-tenant é lei.** Toda query de dado de barbearia filtra por `tenantId` vindo do
token — nunca do body nem da query string.

**Regra de negócio mora no backend.** Se a tela impede algo, a API impede também. Já
houve agendamento duplicado e agendamento no passado aceitos pela API porque só o
frontend validava.

**Todo erro de formulário mostra toast** (`useToast`). Erro que só vai para o console
é erro invisível.

**Segredo nunca entra no repositório.** Chave de API, senha e connection string ficam
em variável de ambiente; o `.env.example` leva placeholder.

## Git

Trabalhar em branch, nunca commitar direto no `master`. Todo commit termina com:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: <url da sessão>
```
