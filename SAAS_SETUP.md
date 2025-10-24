# Barba Brutal SaaS - Guia de Configuração

## 📋 Visão Geral

Este projeto foi transformado em um SaaS completo para venda de sistema de gestão para barbearias. Os cabelereiros podem adquirir o sistema através do site, com pagamento via Stripe.

## 🎯 Principais Mudanças Implementadas

### 1. Backend (NestJS)

#### Novos Módulos Criados:
- **PlanoModule**: Gerenciamento de planos de assinatura
- **TenantModule**: Gerenciamento de tenants (barbearias)
- **AssinaturaModule**: Integração com Stripe e gerenciamento de assinaturas
- **AuthModule**: Autenticação JWT multi-tenant

#### Schema do Prisma Atualizado:
- Modelo `Plano`: Planos de assinatura disponíveis
- Modelo `Tenant`: Barbearias/salões (tenants)
- Modelo `Assinatura`: Assinaturas dos tenants
- Modelo `Admin`: Usuários administrativos do sistema
- Todos os modelos existentes agora incluem `tenantId` para isolamento de dados

### 2. Frontend (Next.js)

#### Novas Páginas Criadas:
- `/` - Landing page adaptada para SaaS
- `/register` - Registro de novos tenants
- `/login` - Login de tenants
- `/dashboard` - Dashboard do tenant
- `/demo` - Demonstração do sistema
- `/help` - Central de ajuda
- `/contact` - Página de contato
- `/terms` - Termos de uso
- `/privacy` - Política de privacidade
- `/cookies` - Política de cookies
- `/status` - Status do sistema
- `/docs` - Documentação
- `/integrations` - Integrações disponíveis

#### Componentes Adaptados:
- `TituloSlogan`: Adaptado para focar na venda do sistema
- `MenuSuperior`: Incluído links para recursos, preços e depoimentos
- `PlanosPrecos`: Novo componente para exibir planos de assinatura

### 3. Mobile (React Native)

O app mobile precisa ser adaptado para funcionar com o sistema multi-tenant. As adaptações necessárias incluem:
- Adicionar seleção de tenant no login
- Incluir `tenantId` em todas as requisições
- Adaptar contextos para suportar multi-tenancy

## 🚀 Configuração

### 1. Configurar Variáveis de Ambiente

#### Backend (`apps/backend/.env`):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/barba_brutal_saas
JWT_SECRET=your-jwt-secret-here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PORT=3001
NODE_ENV=development
```

#### Frontend (`apps/frontend/.env.local`):
```env
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 2. Instalar Dependências

```bash
# Na raiz do projeto
npm install

# Ou no backend
cd apps/backend
npm install

# No frontend
cd apps/frontend
npm install
```

### 3. Configurar Banco de Dados

```bash
cd apps/backend

# Criar migração
npx prisma migrate dev --name init

# Popular planos iniciais
npx ts-node prisma/seed-planos.ts
```

### 4. Iniciar Serviços

```bash
# Backend
cd apps/backend
npm run dev

# Frontend
cd apps/frontend
npm run dev
```

## 💳 Configuração do Stripe

### 1. Criar Conta no Stripe
- Acesse https://stripe.com e crie uma conta
- Obtenha as chaves de API (Publishable Key e Secret Key)

### 2. Configurar Webhooks
- No dashboard do Stripe, vá em Developers > Webhooks
- Adicione endpoint: `https://seu-dominio.com/api/assinaturas/webhook`
- Selecione eventos:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 3. Obter Webhook Secret
- Copie o webhook secret e adicione ao `.env`

## 📊 Planos de Assinatura

Os planos são criados automaticamente pelo seed:

### Básico - R$ 29,90/mês
- Até 5 usuários
- Até 100 agendamentos/mês
- Gestão de clientes
- Relatórios básicos

### Profissional - R$ 59,90/mês (Mais Popular)
- Até 15 usuários
- Até 500 agendamentos/mês
- Gestão de clientes
- Relatórios avançados
- Integração WhatsApp
- Marketing digital

### Premium - R$ 99,90/mês
- Até 50 usuários
- Agendamentos ilimitados
- Gestão de clientes
- Relatórios avançados
- Integração WhatsApp
- Marketing digital
- API personalizada
- Suporte prioritário 24/7

## 🔐 Autenticação Multi-Tenant

O sistema agora suporta 3 tipos de usuários:

### 1. Tenant (Proprietário da Barbearia)
- Acesso completo ao sistema da sua barbearia
- Gerenciamento de profissionais, serviços e agendamentos
- Visualização de relatórios e estatísticas

### 2. Usuário (Funcionário/Cliente)
- Acesso limitado ao tenant específico
- Pode ser barbeiro (acesso a agenda) ou cliente (fazer agendamentos)

### 3. Admin (Administrador do Sistema)
- Acesso a todos os tenants
- Gerenciamento de planos e assinaturas
- Visualização de métricas globais

## 🔄 Fluxo de Registro e Pagamento

1. **Tenant acessa a landing page**
2. **Clica em "Começar Grátis"**
3. **Preenche formulário de registro**
4. **Conta é criada (14 dias de teste grátis)**
5. **Redireciona para dashboard**
6. **Ao final do período de teste, solicita pagamento**
7. **Integração com Stripe para processar pagamento**
8. **Assinatura ativada**

## 🛠️ Próximos Passos

### Backend:
1. ✅ Criar módulos de planos, tenants e assinaturas
2. ✅ Implementar autenticação JWT multi-tenant
3. ✅ Integrar com Stripe
4. ✅ Implementar middleware de verificação de assinatura
5. ✅ Adicionar limites por plano (rate limiting)
6. ✅ Implementar webhooks do Stripe
7. ✅ Criar dashboard administrativo
8. ✅ Implementar isolamento de dados entre tenants

### Frontend:
1. ✅ Adaptar landing page para SaaS
2. ✅ Criar páginas de registro e login
3. ✅ Criar dashboard do tenant
4. ✅ Criar páginas institucionais
5. ✅ Implementar fluxo de pagamento com Stripe
6. ✅ Criar dashboard administrativo

### Mobile:
1. ✅ Adaptar para multi-tenancy
2. ✅ Adicionar seleção de tenant no login
3. ✅ Atualizar contextos e hooks
4. ✅ Criar tela de seleção de tenant
5. ✅ Implementar autenticação multi-tenant

## 📝 Notas Importantes

- **Isolamento de Dados**: Todos os dados são isolados por `tenantId`
- **Segurança**: JWT com verificação de tenant em cada requisição
- **Escalabilidade**: Arquitetura preparada para crescimento
- **Pagamentos**: Integração completa com Stripe
- **Testes**: 14 dias de teste gratuito para novos tenants

## 🐛 Solução de Problemas

### Erro: "Tenant não encontrado"
- Verifique se o `tenantId` está sendo enviado nas requisições
- Confirme se o tenant está ativo no banco de dados

### Erro: "Assinatura inválida"
- Verifique se a assinatura está ativa no Stripe
- Confirme se os webhooks estão configurados corretamente

### Erro: "Limite de usuários excedido"
- Verifique o plano atual do tenant
- Sugira upgrade de plano

## 📞 Suporte

Para dúvidas ou problemas:
- Email: suporte@barbabrutal.com
- Telefone: (11) 99999-9999
- Central de Ajuda: https://barbabrutal.com/help

## 📄 Licença

Este é um projeto proprietário. Todos os direitos reservados.

