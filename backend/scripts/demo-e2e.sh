#!/usr/bin/env bash
# ============================================================================
# 🎬 DEMO E2E — Barba Brutal SaaS
# ============================================================================
# Simula o fluxo completo de uma barbearia do zero, como se fosse apresentar
# o produto para um investidor ou cliente.
#
# USO:
#   ./scripts/demo-e2e.sh                        # local (localhost:3001)
#   ./scripts/demo-e2e.sh https://barba-brutal-api.onrender.com  # produção
# ============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
TIMESTAMP=$(date +%s)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
TOTAL=0

# ── Helpers ──────────────────────────────────────────────────────────────────

banner() {
  echo ""
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}  $1${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

section() {
  echo ""
  echo -e "${CYAN}── $1 ──${NC}"
}

assert_status() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} — $description (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌ FAIL${NC} — $description (esperado $expected, recebeu $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_json_field() {
  local description="$1"
  local json="$2"
  local field="$3"
  TOTAL=$((TOTAL + 1))
  local value
  value=$(echo "$json" | grep -o "\"$field\"" | head -1 || true)
  if [ -n "$value" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} — $description (campo '$field' presente)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌ FAIL${NC} — $description (campo '$field' ausente)"
    FAIL=$((FAIL + 1))
  fi
}

extract_json() {
  # Extrai valor de um campo JSON simples (sem jq)
  local json="$1"
  local field="$2"
  echo "$json" | grep -o "\"$field\":[^,}]*" | head -1 | sed 's/.*://' | tr -d '"  '
}

extract_token() {
  local json="$1"
  echo "$json" | grep -o '"access_token":"[^"]*"' | head -1 | sed 's/"access_token":"//' | sed 's/"$//'
}

http_get() {
  local url="$1"
  local token="${2:-}"
  if [ -n "$token" ]; then
    curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" "$url" 2>/dev/null
  else
    curl -s -w "\n%{http_code}" -H "Content-Type: application/json" "$url" 2>/dev/null
  fi
}

http_post() {
  local url="$1"
  local data="$2"
  local token="${3:-}"
  if [ -n "$token" ]; then
    curl -s -w "\n%{http_code}" -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null
  else
    curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null
  fi
}

http_put() {
  local url="$1"
  local data="$2"
  local token="${3:-}"
  curl -s -w "\n%{http_code}" -X PUT -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null
}

http_patch() {
  local url="$1"
  local data="$2"
  local token="${3:-}"
  curl -s -w "\n%{http_code}" -X PATCH -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null
}

http_delete() {
  local url="$1"
  local token="${2:-}"
  curl -s -w "\n%{http_code}" -X DELETE -H "Authorization: Bearer $token" -H "Content-Type: application/json" "$url" 2>/dev/null
}

parse_response() {
  # Separa body e status code
  local response="$1"
  BODY=$(echo "$response" | sed '$d')
  STATUS=$(echo "$response" | tail -1)
}


# ════════════════════════════════════════════════════════════════════════════
#  INÍCIO DA DEMO
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}${YELLOW}"
echo "  ██████╗  █████╗ ██████╗ ██████╗  █████╗     ██████╗ ██████╗ ██╗   ██╗████████╗ █████╗ ██╗     "
echo "  ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██║     "
echo "  ██████╔╝███████║██████╔╝██████╔╝███████║    ██████╔╝██████╔╝██║   ██║   ██║   ███████║██║     "
echo "  ██╔══██╗██╔══██║██╔══██╗██╔══██╗██╔══██║    ██╔══██╗██╔══██╗██║   ██║   ██║   ██╔══██║██║     "
echo "  ██████╔╝██║  ██║██║  ██║██████╔╝██║  ██║    ██████╔╝██║  ██║╚██████╔╝   ██║   ██║  ██║███████╗"
echo "  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚══════╝"
echo -e "${NC}"
echo -e "${BOLD}  🎬 Demo End-to-End — Sistema de Gestão de Barbearias SaaS${NC}"
echo -e "  📡 API: ${BLUE}$BASE_URL${NC}"
echo -e "  🕐 Iniciado em: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ════════════════════════════════════════════════════════════════════════════
#  FASE 1: Health Check e Planos Públicos
# ════════════════════════════════════════════════════════════════════════════

banner "📡 FASE 1: Health Check & Endpoints Públicos"

section "1.1 Health Check"
parse_response "$(http_get "$BASE_URL/health")"
assert_status "GET /health retorna 200" 200 "$STATUS"
assert_json_field "Resposta contém campo 'status'" "$BODY" "status"
echo -e "     📋 Resposta: $BODY"

section "1.2 Listar Planos (público)"
parse_response "$(http_get "$BASE_URL/planos")"
assert_status "GET /planos retorna 200" 200 "$STATUS"
echo -e "     📋 Planos disponíveis:"
# Exibir nomes dos planos
echo "$BODY" | grep -o '"nome":"[^"]*"' | sed 's/"nome":"/     • /' | sed 's/"$//' || echo "     (nenhum plano encontrado — execute o seed primeiro)"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 2: Login como Admin do SaaS
# ════════════════════════════════════════════════════════════════════════════

banner "🔐 FASE 2: Admin do SaaS — Painel de Controle"

section "2.1 Login do Admin"
parse_response "$(http_post "$BASE_URL/auth/admin/login" '{"email":"admin@barbabrutal.app","senha":"#Senha123"}')"
assert_status "POST /auth/admin/login retorna 201" 201 "$STATUS"
ADMIN_TOKEN=$(extract_token "$BODY")
if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "     🔑 Token: ${ADMIN_TOKEN:0:30}..."
else
  echo -e "  ${RED}⚠️  Não foi possível extrair token do admin. O seed foi executado?${NC}"
  echo -e "  ${YELLOW}Dica: execute 'npx ts-node prisma/seed.ts' primeiro.${NC}"
fi

section "2.2 Dashboard do Admin"
parse_response "$(http_get "$BASE_URL/admin/dashboard" "$ADMIN_TOKEN")"
assert_status "GET /admin/dashboard retorna 200" 200 "$STATUS"
echo -e "     📊 Dashboard:"
TOTAL_TENANTS=$(extract_json "$BODY" "totalTenants")
TOTAL_ASSINATURAS=$(extract_json "$BODY" "totalAssinaturas")
RECEITA=$(extract_json "$BODY" "receitaMensal")
echo -e "     • Total de barbearias: $TOTAL_TENANTS"
echo -e "     • Total de assinaturas: $TOTAL_ASSINATURAS"
echo -e "     • Receita mensal: R\$ $RECEITA"

section "2.3 Listar Tenants (Admin)"
parse_response "$(http_get "$BASE_URL/admin/tenants" "$ADMIN_TOKEN")"
assert_status "GET /admin/tenants retorna 200" 200 "$STATUS"
echo -e "     📋 Barbearias cadastradas:"
echo "$BODY" | grep -o '"nome":"[^"]*"' | sed 's/"nome":"/     • /' | sed 's/"$//' || echo "     (nenhuma)"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 3: Cadastro de uma Nova Barbearia (Fluxo de Onboarding)
# ════════════════════════════════════════════════════════════════════════════

banner "🏢 FASE 3: Onboarding — Nova Barbearia se cadastra"

DEMO_EMAIL="demo${TIMESTAMP}@barbabrutal.app"
DEMO_NOME="Barbearia Demo $TIMESTAMP"

section "3.1 Cadastrar Nova Barbearia (Tenant)"
parse_response "$(http_post "$BASE_URL/auth/tenant/register" "{
  \"nome\": \"$DEMO_NOME\",
  \"email\": \"$DEMO_EMAIL\",
  \"telefone\": \"11912345678\",
  \"senha\": \"#Demo2025\",
  \"endereco\": \"Av. Teste, 100 - São Paulo/SP\",
  \"cnpj\": \"00.000.000/0001-$TIMESTAMP\"
}")"
assert_status "POST /auth/tenant/register retorna 201" 201 "$STATUS"
TENANT_TOKEN=$(extract_token "$BODY")
TENANT_ID=$(extract_json "$BODY" "id" | head -1)
echo -e "     🏢 Barbearia: $DEMO_NOME"
echo -e "     📧 Email: $DEMO_EMAIL"
echo -e "     🆔 Tenant ID: $TENANT_ID"
echo -e "     🔑 Token: ${TENANT_TOKEN:0:30}..."

section "3.2 Consultar Dados da Barbearia (GET /tenants/me)"
parse_response "$(http_get "$BASE_URL/tenants/me" "$TENANT_TOKEN")"
assert_status "GET /tenants/me retorna 200" 200 "$STATUS"
assert_json_field "Resposta contém 'nome'" "$BODY" "nome"
echo -e "     📋 Dados: $(echo "$BODY" | head -c 200)..."

section "3.3 Admin ativa assinatura Trial para a nova barbearia"
# Buscar plano Básico
parse_response "$(http_get "$BASE_URL/planos")"
PLANO_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')
echo -e "     📋 Usando plano ID: $PLANO_ID (Básico)"

# Admin cria assinatura trial via endpoint direto
parse_response "$(http_post "$BASE_URL/assinaturas/checkout" "{
  \"tenantId\": $TENANT_ID,
  \"planoId\": $PLANO_ID,
  \"successUrl\": \"http://localhost:3000/dashboard\",
  \"cancelUrl\": \"http://localhost:3000/planos\"
}")"
echo -e "     💳 Checkout: HTTP $STATUS"
echo -e "     📋 (Em produção, o tenant pagaria via Pix/Stripe)"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 4: Dono da Barbearia configura o negócio
# ════════════════════════════════════════════════════════════════════════════

banner "⚙️  FASE 4: Dono Configura a Barbearia"

# Primeiro, vamos logar como um tenant que JÁ TEM assinatura (seed data)
section "4.0 Login como Barbearia Brutal (tenant com assinatura ativa)"
parse_response "$(http_post "$BASE_URL/auth/tenant/login" '{"email":"contato@barbabrutal.app","senha":"#Senha123"}')"
assert_status "POST /auth/tenant/login retorna 201" 201 "$STATUS"
OWNER_TOKEN=$(extract_token "$BODY")
OWNER_ID=$(extract_json "$BODY" "id" | head -1)
echo -e "     🔑 Token do dono: ${OWNER_TOKEN:0:30}..."
echo -e "     🆔 Tenant ID (seed): $OWNER_ID"

section "4.1 Criar Serviço — Corte Degradê"
parse_response "$(http_post "$BASE_URL/servicos" "{
  \"nome\": \"Corte Degradê Demo\",
  \"descricao\": \"Degradê moderno e estiloso com acabamento perfeito\",
  \"preco\": 35.00,
  \"qtdeSlots\": 1,
  \"imagemURL\": \"https://images.unsplash.com/photo-1503951914875-452162b0f3f1\"
}" "$OWNER_TOKEN")"
assert_status "POST /servicos retorna 201 (Corte Degradê)" 201 "$STATUS"
SERVICO_ID=$(extract_json "$BODY" "id")
echo -e "     ✂️  Serviço criado: Corte Degradê (ID: $SERVICO_ID)"

section "4.2 Criar Serviço — Barba Artesanal"
parse_response "$(http_post "$BASE_URL/servicos" "{
  \"nome\": \"Barba Artesanal Demo\",
  \"descricao\": \"Barba feita com navalha, toalha quente e óleo especial\",
  \"preco\": 30.00,
  \"qtdeSlots\": 1,
  \"imagemURL\": \"https://images.unsplash.com/photo-1621605815971-fbc98d665033\"
}" "$OWNER_TOKEN")"
assert_status "POST /servicos retorna 201 (Barba Artesanal)" 201 "$STATUS"
SERVICO2_ID=$(extract_json "$BODY" "id")
echo -e "     🧔 Serviço criado: Barba Artesanal (ID: $SERVICO2_ID)"

section "4.3 Listar Todos os Serviços"
parse_response "$(http_get "$BASE_URL/servicos" "$OWNER_TOKEN")"
assert_status "GET /servicos retorna 200" 200 "$STATUS"
echo -e "     📋 Serviços cadastrados:"
echo "$BODY" | grep -o '"nome":"[^"]*"' | sed 's/"nome":"/     • /' | sed 's/"$//'

section "4.4 Criar Profissional — Rafael Cortes"
parse_response "$(http_post "$BASE_URL/profissionais" "{
  \"nome\": \"Rafael Cortes Demo\",
  \"descricao\": \"Especialista em cortes modernos e degradê\",
  \"imagemUrl\": \"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d\",
  \"avaliacao\": 4.8,
  \"quantidadeAvaliacoes\": 150,
  \"email\": \"rafael.demo${TIMESTAMP}@barbabrutal.app\",
  \"senha\": \"#Senha123\",
  \"telefone\": \"11911112222\"
}" "$OWNER_TOKEN")"
assert_status "POST /profissionais retorna 201 (Rafael)" 201 "$STATUS"
PROF_ID=$(extract_json "$BODY" "id")
echo -e "     💈 Profissional criado: Rafael Cortes (ID: $PROF_ID)"

section "4.5 Criar Profissional — Lucas Barbeiro"
parse_response "$(http_post "$BASE_URL/profissionais" "{
  \"nome\": \"Lucas Barbeiro Demo\",
  \"descricao\": \"Mestre em barbas e cuidados masculinos\",
  \"imagemUrl\": \"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d\",
  \"avaliacao\": 4.6,
  \"quantidadeAvaliacoes\": 95,
  \"email\": \"lucas.demo${TIMESTAMP}@barbabrutal.app\",
  \"senha\": \"#Senha123\",
  \"telefone\": \"11933334444\"
}" "$OWNER_TOKEN")"
assert_status "POST /profissionais retorna 201 (Lucas)" 201 "$STATUS"
PROF2_ID=$(extract_json "$BODY" "id")
echo -e "     💈 Profissional criado: Lucas Barbeiro (ID: $PROF2_ID)"

section "4.6 Listar Profissionais"
parse_response "$(http_get "$BASE_URL/profissionais" "$OWNER_TOKEN")"
assert_status "GET /profissionais retorna 200" 200 "$STATUS"
echo -e "     📋 Profissionais:"
echo "$BODY" | grep -o '"nome":"[^"]*"' | sed 's/"nome":"/     • /' | sed 's/"$//'

section "4.7 Listar Usuários da Barbearia"
parse_response "$(http_get "$BASE_URL/usuarios" "$OWNER_TOKEN")"
assert_status "GET /usuarios retorna 200" 200 "$STATUS"
echo -e "     📋 Usuários:"
echo "$BODY" | grep -o '"nome":"[^"]*"' | sed 's/"nome":"/     • /' | sed 's/"$//'

section "4.8 Configurações da Barbearia"
parse_response "$(http_put "$BASE_URL/tenants/me/configuracoes" "{
  \"horarioAbertura\": \"08:00\",
  \"horarioFechamento\": \"20:00\",
  \"diasFuncionamento\": [1, 2, 3, 4, 5, 6],
  \"intervaloSlots\": 30,
  \"agendamentoOnline\": true
}" "$OWNER_TOKEN")"
assert_status "PUT /tenants/me/configuracoes retorna 200" 200 "$STATUS"
echo -e "     ⚙️  Configurações salvas (08h-20h, seg-sáb, slots de 30min)"

section "4.9 Estatísticas da Barbearia"
parse_response "$(http_get "$BASE_URL/tenants/me/stats" "$OWNER_TOKEN")"
assert_status "GET /tenants/me/stats retorna 200" 200 "$STATUS"
echo -e "     📊 Stats: $BODY"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 5: Cliente se cadastra e faz agendamento
# ════════════════════════════════════════════════════════════════════════════

banner "📅 FASE 5: Cliente Agenda um Horário"

CLIENTE_EMAIL="cliente.demo${TIMESTAMP}@gmail.com"

section "5.1 Cadastrar Cliente"
parse_response "$(http_post "$BASE_URL/auth/usuario/register" "{
  \"nome\": \"Carlos Demo Cliente\",
  \"email\": \"$CLIENTE_EMAIL\",
  \"telefone\": \"11955556666\",
  \"senha\": \"#Cliente123\",
  \"barbeiro\": false,
  \"tenantId\": $OWNER_ID
}")"
assert_status "POST /auth/usuario/register retorna 201" 201 "$STATUS"
CLIENTE_TOKEN=$(extract_token "$BODY")
CLIENTE_ID=$(extract_json "$BODY" "id" | head -1)
echo -e "     👤 Cliente: Carlos Demo Cliente"
echo -e "     📧 Email: $CLIENTE_EMAIL"
echo -e "     🆔 ID: $CLIENTE_ID"

section "5.2 Cliente lista Serviços disponíveis"
parse_response "$(http_get "$BASE_URL/servicos" "$CLIENTE_TOKEN")"
assert_status "GET /servicos (cliente) retorna 200" 200 "$STATUS"
echo -e "     📋 Serviços que o cliente pode agendar:"
echo "$BODY" | grep -o '"nome":"[^"]*"' | sed 's/"nome":"/     • /' | sed 's/"$//'

section "5.3 Cliente lista Profissionais"
parse_response "$(http_get "$BASE_URL/profissionais" "$CLIENTE_TOKEN")"
assert_status "GET /profissionais (cliente) retorna 200" 200 "$STATUS"

section "5.4 Verificar Horários Disponíveis"
AMANHA=$(date -d "+1 day" '+%Y-%m-%d' 2>/dev/null || date -v+1d '+%Y-%m-%d' 2>/dev/null || echo "2026-07-19")
# Buscar primeiro profissional do seed (Marcão)
parse_response "$(http_get "$BASE_URL/profissionais" "$CLIENTE_TOKEN")"
FIRST_PROF_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')
echo -e "     📅 Verificando horários para profissional $FIRST_PROF_ID em $AMANHA"
parse_response "$(http_get "$BASE_URL/agendamentos/$FIRST_PROF_ID/$AMANHA" "$CLIENTE_TOKEN")"
assert_status "GET /agendamentos/:prof/:data retorna 200" 200 "$STATUS"

section "5.5 Criar Agendamento"
# Buscar primeiro serviço do seed
parse_response "$(http_get "$BASE_URL/servicos" "$CLIENTE_TOKEN")"
FIRST_SERVICO_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

parse_response "$(http_post "$BASE_URL/agendamentos" "{
  \"data\": \"${AMANHA}T10:00:00.000Z\",
  \"profissionalId\": $FIRST_PROF_ID,
  \"servicos\": [$FIRST_SERVICO_ID],
  \"usuarioId\": $CLIENTE_ID,
  \"tenantId\": $OWNER_ID
}" "$CLIENTE_TOKEN")"
assert_status "POST /agendamentos retorna 201" 201 "$STATUS"
echo -e "     📅 Agendamento criado para $AMANHA às 10:00"
echo -e "     💈 Profissional ID: $FIRST_PROF_ID"
echo -e "     ✂️  Serviço ID: $FIRST_SERVICO_ID"

section "5.6 Verificar Agendamentos do Cliente"
parse_response "$(http_get "$BASE_URL/agendamentos/$CLIENTE_EMAIL" "$CLIENTE_TOKEN")"
assert_status "GET /agendamentos/:email retorna 200" 200 "$STATUS"
AGENDAMENTOS_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l)
echo -e "     📋 Agendamentos do cliente: $AGENDAMENTOS_COUNT"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 6: Barbeiro consulta seus horários
# ════════════════════════════════════════════════════════════════════════════

banner "💈 FASE 6: Barbeiro Consulta seus Horários"

section "6.1 Login como Barbeiro (Rafael)"
parse_response "$(http_post "$BASE_URL/auth/usuario/login" "{
  \"email\": \"rafael.demo${TIMESTAMP}@barbabrutal.app\",
  \"senha\": \"#Senha123\",
  \"tenantId\": $OWNER_ID
}")"
assert_status "POST /auth/usuario/login (barbeiro) retorna 201" 201 "$STATUS"
BARBEIRO_TOKEN=$(extract_token "$BODY")
echo -e "     🔑 Token barbeiro: ${BARBEIRO_TOKEN:0:30}..."

section "6.2 Barbeiro consulta seus agendamentos"
parse_response "$(http_get "$BASE_URL/agendamentos/barbeiro/meus-horarios" "$BARBEIRO_TOKEN")"
assert_status "GET /agendamentos/barbeiro/meus-horarios retorna 200" 200 "$STATUS"
echo -e "     📋 Horários do barbeiro: $BODY"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 7: Dono consulta agendamentos e gestão
# ════════════════════════════════════════════════════════════════════════════

banner "📊 FASE 7: Dono Visualiza Agendamentos e Gestão"

section "7.1 Dono consulta todos os agendamentos"
parse_response "$(http_get "$BASE_URL/tenants/me/agendamentos" "$OWNER_TOKEN")"
assert_status "GET /tenants/me/agendamentos retorna 200" 200 "$STATUS"
TOTAL_AGENDAMENTOS=$(echo "$BODY" | grep -o '"id"' | wc -l)
echo -e "     📋 Total de agendamentos da barbearia: $TOTAL_AGENDAMENTOS"

section "7.2 Dono consulta limites do plano"
parse_response "$(http_get "$BASE_URL/tenants/$OWNER_ID/limits" "$OWNER_TOKEN")"
assert_status "GET /tenants/:id/limits retorna 200" 200 "$STATUS"
echo -e "     📊 Limites: $BODY"

# ════════════════════════════════════════════════════════════════════════════
#  FASE 8: Testes de Segurança e Isolamento
# ════════════════════════════════════════════════════════════════════════════

banner "🔒 FASE 8: Testes de Segurança & Isolamento Multi-Tenant"

section "8.1 Acesso sem token deve falhar"
parse_response "$(http_get "$BASE_URL/servicos")"
assert_status "GET /servicos sem token retorna 401" 401 "$STATUS"
echo -e "     🔒 Acesso negado corretamente"

section "8.2 Token inválido deve falhar"
parse_response "$(http_get "$BASE_URL/servicos" "token-invalido-xyz")"
assert_status "GET /servicos com token inválido retorna 401" 401 "$STATUS"
echo -e "     🔒 Token inválido rejeitado"

section "8.3 Cliente não pode criar serviço (não é dono)"
parse_response "$(http_post "$BASE_URL/servicos" "{
  \"nome\": \"Serviço Hacker\",
  \"descricao\": \"Tentativa de invasão\",
  \"preco\": 0,
  \"qtdeSlots\": 1
}" "$CLIENTE_TOKEN")"
assert_status "POST /servicos por cliente retorna 403" 403 "$STATUS"
echo -e "     🔒 Cliente não pode criar serviços — correto!"

section "8.4 Isolamento entre tenants — Tenant 2 não vê dados do Tenant 1"
parse_response "$(http_post "$BASE_URL/auth/tenant/login" '{"email":"contato@corteestilo.app","senha":"#Senha123"}')"
TENANT2_TOKEN=$(extract_token "$BODY")
if [ -n "$TENANT2_TOKEN" ]; then
  parse_response "$(http_get "$BASE_URL/servicos" "$TENANT2_TOKEN")"
  assert_status "GET /servicos do Tenant 2 retorna 200" 200 "$STATUS"
  HAS_DEMO=$(echo "$BODY" | grep -c "Corte Degradê Demo" || true)
  TOTAL=$((TOTAL + 1))
  if [ "$HAS_DEMO" -eq 0 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} — Tenant 2 NÃO vê serviços do Tenant 1 (isolamento OK)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌ FAIL${NC} — Tenant 2 conseguiu ver serviços do Tenant 1 (VAZAMENTO!)"
    FAIL=$((FAIL + 1))
  fi
else
  echo -e "  ${YELLOW}⚠️  SKIP${NC} — Tenant 2 não encontrado (pode não ter seed)"
fi

# ════════════════════════════════════════════════════════════════════════════
#  FASE 9: Admin do SaaS — Visão Geral Final
# ════════════════════════════════════════════════════════════════════════════

banner "👑 FASE 9: Admin SaaS — Dashboard Final"

section "9.1 Dashboard atualizado após demo"
parse_response "$(http_get "$BASE_URL/admin/dashboard" "$ADMIN_TOKEN")"
assert_status "GET /admin/dashboard retorna 200" 200 "$STATUS"
echo -e "     📊 Dashboard Final:"
TOTAL_TENANTS_FINAL=$(extract_json "$BODY" "totalTenants")
echo -e "     • Total barbearias: $TOTAL_TENANTS_FINAL"

section "9.2 Top Tenants"
parse_response "$(http_get "$BASE_URL/admin/top-tenants?limit=5" "$ADMIN_TOKEN")"
assert_status "GET /admin/top-tenants retorna 200" 200 "$STATUS"

section "9.3 Receita"
parse_response "$(http_get "$BASE_URL/admin/revenue?months=3" "$ADMIN_TOKEN")"
assert_status "GET /admin/revenue retorna 200" 200 "$STATUS"

# ════════════════════════════════════════════════════════════════════════════
#  LIMPEZA (Opcional)
# ════════════════════════════════════════════════════════════════════════════

banner "🧹 FASE 10: Limpeza dos Dados de Demo"

section "10.1 Deletar serviços criados na demo"
if [ -n "$SERVICO_ID" ]; then
  parse_response "$(http_delete "$BASE_URL/servicos/$SERVICO_ID" "$OWNER_TOKEN")"
  echo -e "     🗑️  Serviço $SERVICO_ID removido (HTTP $STATUS)"
fi
if [ -n "$SERVICO2_ID" ]; then
  parse_response "$(http_delete "$BASE_URL/servicos/$SERVICO2_ID" "$OWNER_TOKEN")"
  echo -e "     🗑️  Serviço $SERVICO2_ID removido (HTTP $STATUS)"
fi

section "10.2 Deletar profissionais criados na demo"
if [ -n "$PROF_ID" ]; then
  parse_response "$(http_delete "$BASE_URL/profissionais/$PROF_ID" "$OWNER_TOKEN")"
  echo -e "     🗑️  Profissional $PROF_ID removido (HTTP $STATUS)"
fi
if [ -n "$PROF2_ID" ]; then
  parse_response "$(http_delete "$BASE_URL/profissionais/$PROF2_ID" "$OWNER_TOKEN")"
  echo -e "     🗑️  Profissional $PROF2_ID removido (HTTP $STATUS)"
fi

section "10.3 Deletar tenant demo"
if [ -n "$TENANT_ID" ]; then
  parse_response "$(http_delete "$BASE_URL/tenants/$TENANT_ID" "$ADMIN_TOKEN")"
  echo -e "     🗑️  Tenant demo $TENANT_ID removido (HTTP $STATUS)"
fi

# ════════════════════════════════════════════════════════════════════════════
#  RESULTADO FINAL
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📋 RESULTADO FINAL DA DEMO${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total de testes:  ${BOLD}$TOTAL${NC}"
echo -e "  ${GREEN}✅ Passou:         $PASS${NC}"
echo -e "  ${RED}❌ Falhou:         $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}🎉 TODOS OS TESTES PASSARAM! A demo está perfeita!${NC}"
else
  echo -e "  ${YELLOW}${BOLD}⚠️  Alguns testes falharam. Verifique os erros acima.${NC}"
fi

echo ""
echo -e "  ${BLUE}🔗 Endpoints testados:${NC}"
echo -e "     • GET  /health"
echo -e "     • GET  /planos"
echo -e "     • POST /auth/admin/login"
echo -e "     • POST /auth/tenant/login"
echo -e "     • POST /auth/tenant/register"
echo -e "     • POST /auth/usuario/login"
echo -e "     • POST /auth/usuario/register"
echo -e "     • GET  /admin/dashboard"
echo -e "     • GET  /admin/tenants"
echo -e "     • GET  /admin/top-tenants"
echo -e "     • GET  /admin/revenue"
echo -e "     • GET  /tenants/me"
echo -e "     • GET  /tenants/me/stats"
echo -e "     • GET  /tenants/me/agendamentos"
echo -e "     • PUT  /tenants/me/configuracoes"
echo -e "     • GET  /tenants/:id/limits"
echo -e "     • GET  /servicos"
echo -e "     • POST /servicos"
echo -e "     • DEL  /servicos/:id"
echo -e "     • GET  /profissionais"
echo -e "     • POST /profissionais"
echo -e "     • DEL  /profissionais/:id"
echo -e "     • GET  /usuarios"
echo -e "     • GET  /agendamentos/:prof/:data"
echo -e "     • GET  /agendamentos/:email"
echo -e "     • GET  /agendamentos/barbeiro/meus-horarios"
echo -e "     • POST /agendamentos"
echo -e "     • POST /assinaturas/checkout"
echo -e "     • DEL  /tenants/:id"
echo ""
echo -e "  ${CYAN}Finalizado em: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

exit $FAIL
