# Deployment - Barba Brutal SaaS

## Variáveis de Ambiente Obrigatórias

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host:5432/barba_brutal
JWT_SECRET=your-secret-key-min-32-chars
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://seu-dominio.com
```

### Frontend (.env.local)
```
NEXT_PUBLIC_URL_BASE=https://api.seu-dominio.com
BACKEND_URL=https://api.seu-dominio.com
NEXT_PUBLIC_TENANT_DEFAULT_ID=1
```

## Build & Deploy

### Backend
```bash
cd backend
npm install
npm run db:push
npm run build
npm run start
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run start
```

## Checklist de Produção

- [ ] JWT_SECRET alterado (mínimo 32 caracteres)
- [ ] DATABASE_URL apontando para banco de produção
- [ ] STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET configurados
- [ ] FRONTEND_URL e BACKEND_URL com domínios corretos
- [ ] NODE_ENV=production em ambos
- [ ] CORS configurado apenas para domínio do frontend
- [ ] SSL/TLS habilitado
- [ ] Backups do banco de dados configurados
- [ ] Logs centralizados configurados
- [ ] Rate limiting ativo (60 req/min por tenant)

## Credenciais Padrão (Remover em Produção)

Após primeiro deploy, remova os dados de seed:
```bash
npx prisma db seed  # Apenas em desenvolvimento
```

## Monitoramento

- Health check: `GET /health`
- Logs estruturados com tenantId e userId
- Audit log de todas as operações (POST/PUT/PATCH/DELETE)

