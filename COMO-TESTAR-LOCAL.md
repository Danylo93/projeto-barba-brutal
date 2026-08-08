# Rodando as novidades na sua máquina

Seis funcionalidades novas nesta branch: preço reposicionado, plano anual,
atendimento recorrente, produtos e estoque, sinal no agendamento e
agendamento sem conta.

Este guia sobe tudo local, com dado semeado para você clicar em cada uma sem
precisar cadastrar nada à mão.

> Nada aqui toca produção. O banco é local e descartável.

## 1. Banco

Com Docker:

```bash
docker run -d --name barba-local -p 55432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=barba postgres:16
export PGURL="postgresql://postgres:postgres@localhost:55432/barba"
```

Sem Docker, com o Postgres do sistema:

```bash
export PGURL="postgresql://postgres@localhost:5432/barba"
createdb barba
```

## 2. Migrações e dados

```bash
cd backend
export DATABASE_URL="$PGURL" DIRECT_URL="$PGURL"

npx prisma migrate deploy     # cria as tabelas novas
npm run db:seed               # barbearias, equipe, serviços, clientes
npm run db:seed-planos        # os 6 planos: 3 mensais + 3 anuais
npm run db:seed-novidades     # liga sinal, cria produtos e uma recorrência
```

O `db:seed-novidades` é o que faz as telas novas abrirem com conteúdo. Ele
deixa de propósito um produto **acabando** e outro **zerado**, para dar para
ver o alerta de reposição e a recusa de venda sem estoque.

## 3. Backend

```bash
cd backend
DATABASE_URL="$PGURL" DIRECT_URL="$PGURL" \
JWT_SECRET="local" LEMBRETE_TOKEN="local" FRONTEND_URL="http://localhost:3000" \
npm run dev
```

Sobe em `http://localhost:3001`. Confira: `curl localhost:3001/health`.

## 4. Frontend

```bash
cd frontend
BACKEND_URL="http://localhost:3001" npm run dev
```

Abre em `http://localhost:3000`.

## Contas

Senha `#Senha123` em todas.

| Papel | E-mail | Onde entrar |
|---|---|---|
| Dono | `contato@barbeariadomarcao.app` | `/login` |
| Barbeiro | `marcao@barbeariadomarcao.app` | `/login?tenant=1` |
| Cliente | `joao@barbeariadomarcao.app` | `/login?tenant=1` |
| Admin do SaaS | `admin@barbabrutal.app` | `/login` |

## O que olhar em cada uma

**Preço e plano anual** — `http://localhost:3000/#pricing`. O alternador
Mensal/Anual troca os três cartões. No anual, o número grande é o equivalente
**por mês** (R$ 58,25 no Profissional), com o valor do ano e a economia
embaixo. Os preços vêm da API: mude no banco e a tela acompanha.

**O robô na landing** — `http://localhost:3000/#whatsapp`. A conversa de
exemplo mostrando "quero cortar sábado de manhã" virando horário fechado.

**Agendamento sem conta** — `http://localhost:3000/barbearia/barbeariadomarcao`.
Clique em qualquer "Agendar" e o formulário está na própria página. Escolha
serviço → profissional → dia → hora → nome e WhatsApp. Repare que o aviso do
sinal aparece assim que você escolhe o serviço, e que a confirmação traz o Pix
copia e cola.

**Sinal** — depois de marcar acima, entre como dono em `/agendamentos`. O
agendamento aparece como "Aguardando sinal de R$ X" com os botões **Recebi o
Pix** e **Dispensar**. A regra fica em `/configuracoes` → aba **Recebimento**,
com um exemplo calculado num corte de R$ 50.

**Produtos e estoque** — `/produtos`. Óleo para barba está abaixo do mínimo
(alerta amarelo) e o shampoo está zerado — tente vender e veja a recusa. Como
dono você vê lucro separado de faturamento; o barbeiro vê a tela mas não os
preços de custo nem o cadastro.

**Atendimento recorrente** — `/recorrentes`. Já vem uma série "todo sábado às
10h". Criar outra mostra quantos horários nasceram e quais ficaram de fora por
conflito.

## Provas automatizadas

```bash
cd backend  && npx jest          # 648
cd frontend && npx jest          # 58
```

E a prova de ponta a ponta contra a API de verdade, que é a que pega o que os
testes de unidade não pegam (permissão, concorrência de estoque, SQL com
campo nulo):

```bash
cd backend
DATABASE_URL="$PGURL" DIRECT_URL="$PGURL" JWT_SECRET="local" \
  npx ts-node -r tsconfig-paths/register test/prova-local.ts
```

São 34 verificações. Ela **zera o banco** a cada execução — nunca aponte para
produção.

## Antes de subir para produção

A migração roda sozinha no deploy, **o seed não**. Os planos novos (inclusive
os anuais) só existem em produção depois de:

```
POST /planos/sincronizar-catalogo?simular=true    # confere o que mudaria
POST /planos/sincronizar-catalogo                 # aplica
```

Ambos exigem token de admin do SaaS. Reajuste não afeta quem já assina: a
recorrência do Mercado Pago nasce com o valor congelado na contratação.
