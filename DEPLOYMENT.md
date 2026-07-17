# Deploy em Produção — Barba Brutal SaaS

Stack: **Vercel** (frontend) + **Neon** (Postgres) + **Render** (backend, plano free).

> Ordem importa: primeiro o banco (Neon), depois o backend (Render, que precisa
> da URL do banco), por último o frontend (Vercel, que precisa da URL do backend).

---

## 1) Banco — Neon (neon.tech)

1. Crie conta em https://neon.tech (login com GitHub) e um projeto
   (ex.: `barba-brutal`, região AWS São Paulo `sa-east-1`).
2. No dashboard do projeto, abra **Connect** e copie DUAS URLs:
   - **Pooled connection** (host contém `-pooler`) → será a `DATABASE_URL`
   - **Direct connection** (sem `-pooler`) → será a `DIRECT_URL`
   Ambas já vêm com `?sslmode=require` — mantenha.

Nada para rodar agora: as migrations rodam automaticamente no deploy do backend.

## 2) Backend — Render (render.com)

O repositório já tem um **`render.yaml`** na raiz (blueprint).

1. Suba o repositório para o GitHub (se ainda não estiver).
2. Em https://render.com → **New → Blueprint** → conecte o repositório.
   O Render lê o `render.yaml` e cria o serviço `barba-brutal-api`.
3. Preencha as variáveis pedidas:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | URL **pooled** do Neon |
   | `DIRECT_URL` | URL **direta** do Neon |
   | `FRONTEND_URL` | depois do passo 3, a URL da Vercel (ex.: `https://barba-brutal.vercel.app`). Aceita várias separadas por vírgula |
   | `MERCADO_PAGO_ACCESS_TOKEN` | seu token do Mercado Pago (pode deixar vazio; Pix fica indisponível e o admin confirma manual) |
   - `JWT_SECRET` é gerado automaticamente pelo Render.
4. Deploy. O start roda `prisma migrate deploy` (cria as tabelas no Neon) e sobe a API.
5. Anote a URL do serviço (ex.: `https://barba-brutal-api.onrender.com`) e teste:
   `https://barba-brutal-api.onrender.com/health` → `{"status":"ok","db":"ok"}`.

### Seed inicial (planos + admin) — uma vez só
No seu terminal local, apontando para o Neon:

```bash
cd backend
DATABASE_URL="<URL_POOLED_DO_NEON>" DIRECT_URL="<URL_DIRETA_DO_NEON>" npx ts-node prisma/seed-planos.ts
```

Para criar o admin do sistema, rode o SQL no **SQL Editor do Neon**
(gere um hash bcrypt novo — NÃO use a senha dos seeds de dev em produção):

```sql
INSERT INTO admin (nome, email, senha, ativo, "createdAt", "updatedAt")
VALUES ('Administrador', 'seu-email@dominio.com', '<HASH_BCRYPT>', true, now(), now());
```

Gerar o hash localmente: `node -e "console.log(require('bcrypt').hashSync('SuaSenhaForte', 10))"` (rode dentro de `backend/`).

### Limitações do plano free do Render
- O serviço **dorme após ~15 min sem tráfego**; a primeira requisição depois
  disso leva ~50s (cold start). Para demo/começo é ok.
- 750h/mês grátis (um serviço rodando o mês todo cabe).

## 3) Frontend — Vercel (vercel.com)

1. Em https://vercel.com → **Add New → Project** → importe o repositório.
2. **Root Directory: `frontend`** (essencial — é um monorepo).
   Framework: Next.js (auto-detectado).
3. Environment Variables:
   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_URL_BASE` | URL do Render (ex.: `https://barba-brutal-api.onrender.com`) |
   | `BACKEND_URL` | a mesma URL do Render |
   | `NEXT_PUBLIC_TENANT_DEFAULT_ID` | `1` |
4. Deploy. Anote a URL (ex.: `https://barba-brutal.vercel.app`).
5. **Volte ao Render** e preencha/atualize `FRONTEND_URL` com essa URL
   (senão o CORS bloqueia o frontend). Salvar redispara o deploy.

## 4) Webhook do Mercado Pago (quando ativar o Pix)

Em https://www.mercadopago.com.br/developers → sua aplicação → **Webhooks**:
- URL: `https://barba-brutal-api.onrender.com/assinaturas/webhook/mercadopago`
- Evento: **Pagamentos**

Sem o webhook o fluxo também funciona: o botão "Já paguei — verificar" consulta
o Mercado Pago na hora, e o admin pode confirmar manualmente pelo painel.

## 5) Checklist final

- [ ] `/health` do Render responde `ok`
- [ ] Landing abre na Vercel sem erro de CORS no console
- [ ] Cadastro de barbearia (`/register`) cria conta e cai em `/planos`
- [ ] Login admin funciona e o painel lista barbearias/pagamentos
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` configurado (ou fluxo manual combinado)
- [ ] Senhas/segredos de produção NUNCA são os dos seeds de desenvolvimento

## Variáveis — referência rápida

### Backend (Render)
```
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DIRECT_URL=postgresql://.../neondb?sslmode=require
JWT_SECRET=<forte, gerado>
NODE_ENV=production
FRONTEND_URL=https://seu-app.vercel.app
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
STRIPE_SECRET_KEY=sk_test_placeholder   # legado, não usado no fluxo Pix
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

### Frontend (Vercel)
```
NEXT_PUBLIC_URL_BASE=https://barba-brutal-api.onrender.com
BACKEND_URL=https://barba-brutal-api.onrender.com
NEXT_PUBLIC_TENANT_DEFAULT_ID=1
```
