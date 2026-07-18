# ============================================================================
# DEMO E2E - Barba Brutal SaaS (PowerShell)
# ============================================================================
# Simula o fluxo completo de uma barbearia do zero.
#
# USO:
#   .\scripts\demo-e2e.ps1                                          # local
#   .\scripts\demo-e2e.ps1 -BaseUrl https://barba-brutal-api.onrender.com
# ============================================================================

param(
    [string]$BaseUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Continue"
$TIMESTAMP = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$script:PASS = 0
$script:FAIL = 0
$script:TOTAL = 0

function Banner($text) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Magenta
    Write-Host "  $text" -ForegroundColor Magenta
    Write-Host ("=" * 60) -ForegroundColor Magenta
}

function Section($text) {
    Write-Host ""
    Write-Host "-- $text --" -ForegroundColor Cyan
}

function Assert-Status($description, $expected, $actual) {
    $script:TOTAL++
    if ($actual -eq $expected) {
        Write-Host "  [PASS] $description (HTTP $actual)" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  [FAIL] $description (esperado $expected, recebeu $actual)" -ForegroundColor Red
        $script:FAIL++
    }
}

function Assert-JsonField($description, $json, $field) {
    $script:TOTAL++
    if ($json -match [regex]::Escape("`"$field`"")) {
        Write-Host "  [PASS] $description (campo $field presente)" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  [FAIL] $description (campo $field ausente)" -ForegroundColor Red
        $script:FAIL++
    }
}

function Http-Request {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [string]$Body = $null,
        [string]$Token = $null
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($Body -and $Method -ne "GET") {
            $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($Body)
        }
        $response = Invoke-WebRequest @params
        return @{ Status = [int]$response.StatusCode; Body = $response.Content }
    } catch {
        $statusCode = 0
        $errorBody = ""
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
            } catch {
                $errorBody = $_.ErrorDetails.Message
            }
        }
        return @{ Status = $statusCode; Body = $errorBody }
    }
}

function Extract-Token($json) {
    if ($json -match '"access_token":"([^"]+)"') { return $Matches[1] }
    return $null
}

function Extract-Field($json, $field) {
    if ($json -match "`"$field`"\s*:\s*([^,}\]]+)") {
        return $Matches[1].Trim('"', ' ')
    }
    return $null
}

function Extract-AllValues($json, $field) {
    $m = [regex]::Matches($json, "`"$field`"\s*:\s*`"([^`"]+)`"")
    return $m | ForEach-Object { $_.Groups[1].Value }
}

# ============================================================================
Write-Host ""
Write-Host "  BARBA BRUTAL - Demo End-to-End" -ForegroundColor Yellow
Write-Host "  API: $BaseUrl" -ForegroundColor Blue
$startedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "  Iniciado em: $startedAt"
Write-Host ""

# === FASE 1 ===
Banner "FASE 1: Health Check e Endpoints Publicos"

Section "1.1 Health Check"
$r = Http-Request -Url "$BaseUrl/health"
Assert-Status "GET /health retorna 200" 200 $r.Status
Assert-JsonField "Resposta contem campo status" $r.Body "status"
Write-Host "     Resposta: $($r.Body)" -ForegroundColor DarkGray

Section "1.2 Listar Planos (publico)"
$r = Http-Request -Url "$BaseUrl/planos"
Assert-Status "GET /planos retorna 200" 200 $r.Status
$planoNomes = Extract-AllValues $r.Body "nome"
Write-Host "     Planos disponiveis:"
foreach ($p in $planoNomes) { Write-Host "     - $p" }

# === FASE 2 ===
Banner "FASE 2: Admin do SaaS - Painel de Controle"

Section "2.1 Login do Admin"
$adminBody = (@{ email = "admin@barbabrutal.app"; senha = "#Senha123" } | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/auth/admin/login" -Body $adminBody
Assert-Status "POST /auth/admin/login retorna 201" 201 $r.Status
$ADMIN_TOKEN = Extract-Token $r.Body
if ($ADMIN_TOKEN) {
    $tkn = $ADMIN_TOKEN.Substring(0, [Math]::Min(30, $ADMIN_TOKEN.Length))
    Write-Host "     Token: ${tkn}..."
} else {
    Write-Host "  AVISO: Token do admin nao encontrado. Execute o seed!" -ForegroundColor Yellow
}

Section "2.2 Dashboard do Admin"
$r = Http-Request -Url "$BaseUrl/admin/dashboard" -Token $ADMIN_TOKEN
Assert-Status "GET /admin/dashboard retorna 200" 200 $r.Status
Write-Host "     Dashboard:"
$tt = Extract-Field $r.Body "totalTenants"
$ta = Extract-Field $r.Body "totalAssinaturas"
$rm = Extract-Field $r.Body "receitaMensal"
Write-Host "     - Total barbearias: $tt"
Write-Host "     - Total assinaturas: $ta"
Write-Host "     - Receita mensal: R$ $rm"

Section "2.3 Listar Tenants (Admin)"
$r = Http-Request -Url "$BaseUrl/admin/tenants" -Token $ADMIN_TOKEN
Assert-Status "GET /admin/tenants retorna 200" 200 $r.Status
Write-Host "     Barbearias cadastradas:"
$tn = Extract-AllValues $r.Body "nome"
foreach ($t in $tn) { Write-Host "     - $t" }

# === FASE 3 ===
Banner "FASE 3: Onboarding - Nova Barbearia se cadastra"

$DEMO_EMAIL = "demo${TIMESTAMP}@barbabrutal.app"
$DEMO_NOME = "Barbearia Demo $TIMESTAMP"

Section "3.1 Cadastrar Nova Barbearia (Tenant)"
$body = (@{
    nome = $DEMO_NOME
    email = $DEMO_EMAIL
    telefone = "11912345678"
    senha = "#Demo2025"
    endereco = "Av. Teste, 100 - SP"
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/auth/tenant/register" -Body $body
Assert-Status "POST /auth/tenant/register retorna 201" 201 $r.Status
$TENANT_TOKEN = Extract-Token $r.Body
$TENANT_ID = Extract-Field $r.Body "id"
Write-Host "     Barbearia: $DEMO_NOME"
Write-Host "     Email: $DEMO_EMAIL"
Write-Host "     Tenant ID: $TENANT_ID"

Section "3.2 Consultar Dados (GET /tenants/me)"
$r = Http-Request -Url "$BaseUrl/tenants/me" -Token $TENANT_TOKEN
Assert-Status "GET /tenants/me retorna 200" 200 $r.Status

Section "3.3 Checkout do plano"
$r2 = Http-Request -Url "$BaseUrl/planos"
$PLANO_ID = Extract-Field $r2.Body "id"
Write-Host "     Usando plano ID: $PLANO_ID"
$body = (@{
    tenantId = [int]$TENANT_ID
    planoId = [int]$PLANO_ID
    successUrl = "http://localhost:3000/dashboard"
    cancelUrl = "http://localhost:3000/planos"
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/assinaturas/checkout" -Body $body
Write-Host "     Checkout: HTTP $($r.Status)"

# === FASE 4 ===
Banner "FASE 4: Dono Configura a Barbearia"

Section "4.0 Login como Barbearia Brutal (seed)"
$ownerBody = (@{ email = "contato@barbabrutal.app"; senha = "#Senha123" } | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/auth/tenant/login" -Body $ownerBody
Assert-Status "POST /auth/tenant/login retorna 201" 201 $r.Status
$OWNER_TOKEN = Extract-Token $r.Body
$OWNER_ID = Extract-Field $r.Body "id"
$tkn2 = if ($OWNER_TOKEN) { $OWNER_TOKEN.Substring(0, [Math]::Min(30, $OWNER_TOKEN.Length)) } else { "null" }
Write-Host "     Token dono: ${tkn2}..."

Section "4.1 Criar Servico - Corte Degrade"
$body = (@{
    nome = "Corte Degrade Demo"
    descricao = "Degrade moderno e estiloso"
    preco = 35.00
    qtdeSlots = 1
    imagemURL = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1"
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/servicos" -Body $body -Token $OWNER_TOKEN
Assert-Status "POST /servicos retorna 201 (Corte Degrade)" 201 $r.Status
$SERVICO_ID = Extract-Field $r.Body "id"
Write-Host "     Servico criado ID: $SERVICO_ID"

Section "4.2 Criar Servico - Barba Artesanal"
$body = (@{
    nome = "Barba Artesanal Demo"
    descricao = "Barba com navalha e toalha quente"
    preco = 30.00
    qtdeSlots = 1
    imagemURL = "https://images.unsplash.com/photo-1621605815971-fbc98d665033"
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/servicos" -Body $body -Token $OWNER_TOKEN
Assert-Status "POST /servicos retorna 201 (Barba Artesanal)" 201 $r.Status
$SERVICO2_ID = Extract-Field $r.Body "id"
Write-Host "     Servico criado ID: $SERVICO2_ID"

Section "4.3 Listar Servicos"
$r = Http-Request -Url "$BaseUrl/servicos" -Token $OWNER_TOKEN
Assert-Status "GET /servicos retorna 200" 200 $r.Status
Write-Host "     Servicos:"
$sn = Extract-AllValues $r.Body "nome"
foreach ($s in $sn) { Write-Host "     - $s" }

Section "4.4 Criar Profissional - Rafael"
$body = (@{
    nome = "Rafael Cortes Demo"
    descricao = "Especialista em degrade"
    imagemUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
    avaliacao = 4.8
    quantidadeAvaliacoes = 150
    email = "rafael.demo${TIMESTAMP}@barbabrutal.app"
    senha = "#Senha123"
    telefone = "11911112222"
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/profissionais" -Body $body -Token $OWNER_TOKEN
Assert-Status "POST /profissionais retorna 201 (Rafael)" 201 $r.Status
$PROF_ID = Extract-Field $r.Body "id"
Write-Host "     Profissional ID: $PROF_ID"

Section "4.5 Criar Profissional - Lucas"
$body = (@{
    nome = "Lucas Barbeiro Demo"
    descricao = "Mestre em barbas"
    imagemUrl = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d"
    avaliacao = 4.6
    quantidadeAvaliacoes = 95
    email = "lucas.demo${TIMESTAMP}@barbabrutal.app"
    senha = "#Senha123"
    telefone = "11933334444"
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/profissionais" -Body $body -Token $OWNER_TOKEN
Assert-Status "POST /profissionais retorna 201 (Lucas)" 201 $r.Status
$PROF2_ID = Extract-Field $r.Body "id"
Write-Host "     Profissional ID: $PROF2_ID"

Section "4.6 Listar Profissionais"
$r = Http-Request -Url "$BaseUrl/profissionais" -Token $OWNER_TOKEN
Assert-Status "GET /profissionais retorna 200" 200 $r.Status

Section "4.7 Listar Usuarios"
$r = Http-Request -Url "$BaseUrl/usuarios" -Token $OWNER_TOKEN
Assert-Status "GET /usuarios retorna 200" 200 $r.Status

Section "4.8 Configuracoes"
$body = (@{
    horarioAbertura = "08:00"
    horarioFechamento = "20:00"
    diasFuncionamento = @(1,2,3,4,5,6)
    intervaloSlots = 30
    agendamentoOnline = $true
} | ConvertTo-Json)
$r = Http-Request -Method PUT -Url "$BaseUrl/tenants/me/configuracoes" -Body $body -Token $OWNER_TOKEN
Assert-Status "PUT /tenants/me/configuracoes retorna 200" 200 $r.Status
Write-Host "     Configuracoes salvas (08h-20h, seg-sab)"

Section "4.9 Estatisticas"
$r = Http-Request -Url "$BaseUrl/tenants/me/stats" -Token $OWNER_TOKEN
Assert-Status "GET /tenants/me/stats retorna 200" 200 $r.Status

# === FASE 5 ===
Banner "FASE 5: Cliente Agenda um Horario"

$CLIENTE_EMAIL = "cliente.demo${TIMESTAMP}@gmail.com"

Section "5.1 Cadastrar Cliente"
$body = (@{
    nome = "Carlos Demo Cliente"
    email = $CLIENTE_EMAIL
    telefone = "11955556666"
    senha = "#Cliente123"
    barbeiro = $false
    tenantId = [int]$OWNER_ID
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/auth/usuario/register" -Body $body
Assert-Status "POST /auth/usuario/register retorna 201" 201 $r.Status
$CLIENTE_TOKEN = Extract-Token $r.Body
$CLIENTE_ID = Extract-Field $r.Body "id"
Write-Host "     Cliente ID: $CLIENTE_ID"

Section "5.2 Cliente lista Servicos"
$r = Http-Request -Url "$BaseUrl/servicos" -Token $CLIENTE_TOKEN
Assert-Status "GET /servicos (cliente) retorna 200" 200 $r.Status

Section "5.3 Cliente lista Profissionais"
$r = Http-Request -Url "$BaseUrl/profissionais" -Token $CLIENTE_TOKEN
Assert-Status "GET /profissionais (cliente) retorna 200" 200 $r.Status
$FIRST_PROF_ID = Extract-Field $r.Body "id"

Section "5.4 Horarios Disponiveis"
$AMANHA = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$r = Http-Request -Url "$BaseUrl/agendamentos/$FIRST_PROF_ID/$AMANHA" -Token $CLIENTE_TOKEN
Assert-Status "GET /agendamentos/:prof/:data retorna 200" 200 $r.Status

Section "5.5 Criar Agendamento"
$r2 = Http-Request -Url "$BaseUrl/servicos" -Token $CLIENTE_TOKEN
$FIRST_SERVICO_ID = Extract-Field $r2.Body "id"
$body = (@{
    data = "${AMANHA}T10:00:00.000Z"
    profissionalId = [int]$FIRST_PROF_ID
    servicos = @([int]$FIRST_SERVICO_ID)
    usuarioId = [int]$CLIENTE_ID
    tenantId = [int]$OWNER_ID
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/agendamentos" -Body $body -Token $CLIENTE_TOKEN
Assert-Status "POST /agendamentos retorna 201" 201 $r.Status
Write-Host "     Agendamento para $AMANHA as 10:00"

Section "5.6 Agendamentos do Cliente"
$r = Http-Request -Url "$BaseUrl/agendamentos/$CLIENTE_EMAIL" -Token $CLIENTE_TOKEN
Assert-Status "GET /agendamentos/:email retorna 200" 200 $r.Status

# === FASE 6 ===
Banner "FASE 6: Barbeiro Consulta Horarios"

Section "6.1 Login como Barbeiro"
$body = (@{
    email = "rafael.demo${TIMESTAMP}@barbabrutal.app"
    senha = "#Senha123"
    tenantId = [int]$OWNER_ID
} | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/auth/usuario/login" -Body $body
Assert-Status "POST /auth/usuario/login (barbeiro) retorna 201" 201 $r.Status
$BARBEIRO_TOKEN = Extract-Token $r.Body

Section "6.2 Barbeiro consulta seus agendamentos"
$r = Http-Request -Url "$BaseUrl/agendamentos/barbeiro/meus-horarios" -Token $BARBEIRO_TOKEN
Assert-Status "GET /agendamentos/barbeiro/meus-horarios retorna 200" 200 $r.Status

# === FASE 7 ===
Banner "FASE 7: Dono - Agendamentos e Gestao"

Section "7.1 Todos os agendamentos"
$r = Http-Request -Url "$BaseUrl/tenants/me/agendamentos" -Token $OWNER_TOKEN
Assert-Status "GET /tenants/me/agendamentos retorna 200" 200 $r.Status

Section "7.2 Limites do plano"
$r = Http-Request -Url "$BaseUrl/tenants/$OWNER_ID/limits" -Token $OWNER_TOKEN
Assert-Status "GET /tenants/:id/limits retorna 200" 200 $r.Status

# === FASE 8 ===
Banner "FASE 8: Seguranca e Isolamento Multi-Tenant"

Section "8.1 Sem token"
$r = Http-Request -Url "$BaseUrl/servicos"
Assert-Status "GET /servicos sem token retorna 401" 401 $r.Status
Write-Host "     Acesso negado corretamente"

Section "8.2 Token invalido"
$r = Http-Request -Url "$BaseUrl/servicos" -Token "token-invalido-xyz"
Assert-Status "GET /servicos token invalido retorna 401" 401 $r.Status

Section "8.3 Cliente nao pode criar servico"
$body = (@{ nome = "Hacker"; descricao = "Invasao"; preco = 0; qtdeSlots = 1 } | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/servicos" -Body $body -Token $CLIENTE_TOKEN
Assert-Status "POST /servicos por cliente retorna 403" 403 $r.Status
Write-Host "     Cliente nao pode criar servicos - correto!"

Section "8.4 Isolamento entre tenants"
$t2Body = (@{ email = "contato@corteestilo.app"; senha = "#Senha123" } | ConvertTo-Json)
$r = Http-Request -Method POST -Url "$BaseUrl/auth/tenant/login" -Body $t2Body
$TENANT2_TOKEN = Extract-Token $r.Body
if ($TENANT2_TOKEN) {
    $r = Http-Request -Url "$BaseUrl/servicos" -Token $TENANT2_TOKEN
    Assert-Status "GET /servicos Tenant 2 retorna 200" 200 $r.Status
    $script:TOTAL++
    if ($r.Body -notmatch "Corte Degrade Demo") {
        Write-Host "  [PASS] Tenant 2 NAO ve servicos do Tenant 1 (isolamento OK)" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  [FAIL] Tenant 2 viu servicos do Tenant 1 (VAZAMENTO!)" -ForegroundColor Red
        $script:FAIL++
    }
} else {
    Write-Host "  [SKIP] Tenant 2 nao encontrado" -ForegroundColor Yellow
}

# === FASE 9 ===
Banner "FASE 9: Admin SaaS - Dashboard Final"

Section "9.1 Dashboard atualizado"
$r = Http-Request -Url "$BaseUrl/admin/dashboard" -Token $ADMIN_TOKEN
Assert-Status "GET /admin/dashboard retorna 200" 200 $r.Status

Section "9.2 Top Tenants"
$r = Http-Request -Url "$BaseUrl/admin/top-tenants?limit=5" -Token $ADMIN_TOKEN
Assert-Status "GET /admin/top-tenants retorna 200" 200 $r.Status

Section "9.3 Receita"
$r = Http-Request -Url "$BaseUrl/admin/revenue?months=3" -Token $ADMIN_TOKEN
Assert-Status "GET /admin/revenue retorna 200" 200 $r.Status

# === FASE 10: LIMPEZA ===
Banner "FASE 10: Limpeza"

Section "10.1 Deletar servicos demo"
if ($SERVICO_ID) {
    $r = Http-Request -Method DELETE -Url "$BaseUrl/servicos/$SERVICO_ID" -Token $OWNER_TOKEN
    Write-Host "     Servico $SERVICO_ID removido (HTTP $($r.Status))"
}
if ($SERVICO2_ID) {
    $r = Http-Request -Method DELETE -Url "$BaseUrl/servicos/$SERVICO2_ID" -Token $OWNER_TOKEN
    Write-Host "     Servico $SERVICO2_ID removido (HTTP $($r.Status))"
}

Section "10.2 Deletar profissionais demo"
if ($PROF_ID) {
    $r = Http-Request -Method DELETE -Url "$BaseUrl/profissionais/$PROF_ID" -Token $OWNER_TOKEN
    Write-Host "     Profissional $PROF_ID removido (HTTP $($r.Status))"
}
if ($PROF2_ID) {
    $r = Http-Request -Method DELETE -Url "$BaseUrl/profissionais/$PROF2_ID" -Token $OWNER_TOKEN
    Write-Host "     Profissional $PROF2_ID removido (HTTP $($r.Status))"
}

Section "10.3 Deletar tenant demo"
if ($TENANT_ID) {
    $r = Http-Request -Method DELETE -Url "$BaseUrl/tenants/$TENANT_ID" -Token $ADMIN_TOKEN
    Write-Host "     Tenant $TENANT_ID removido (HTTP $($r.Status))"
}

# === RESULTADO ===
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Magenta
Write-Host "  RESULTADO FINAL DA DEMO" -ForegroundColor White
Write-Host ("=" * 60) -ForegroundColor Magenta
Write-Host ""
Write-Host "  Total de testes:  $($script:TOTAL)"
Write-Host "  Passou:           $($script:PASS)" -ForegroundColor Green
Write-Host "  Falhou:           $($script:FAIL)" -ForegroundColor Red
Write-Host ""

if ($script:FAIL -eq 0) {
    Write-Host "  TODOS OS TESTES PASSARAM! A demo esta perfeita!" -ForegroundColor Green
} else {
    Write-Host "  Alguns testes falharam. Verifique os erros acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Endpoints testados:" -ForegroundColor Blue
Write-Host "     GET  /health"
Write-Host "     GET  /planos"
Write-Host "     POST /auth/admin/login"
Write-Host "     POST /auth/tenant/login"
Write-Host "     POST /auth/tenant/register"
Write-Host "     POST /auth/usuario/login"
Write-Host "     POST /auth/usuario/register"
Write-Host "     GET  /admin/dashboard"
Write-Host "     GET  /admin/tenants"
Write-Host "     GET  /admin/top-tenants"
Write-Host "     GET  /admin/revenue"
Write-Host "     GET  /tenants/me"
Write-Host "     GET  /tenants/me/stats"
Write-Host "     GET  /tenants/me/agendamentos"
Write-Host "     PUT  /tenants/me/configuracoes"
Write-Host "     GET  /tenants/:id/limits"
Write-Host "     GET  /servicos"
Write-Host "     POST /servicos"
Write-Host "     DEL  /servicos/:id"
Write-Host "     GET  /profissionais"
Write-Host "     POST /profissionais"
Write-Host "     DEL  /profissionais/:id"
Write-Host "     GET  /usuarios"
Write-Host "     GET  /agendamentos/:prof/:data"
Write-Host "     GET  /agendamentos/:email"
Write-Host "     GET  /agendamentos/barbeiro/meus-horarios"
Write-Host "     POST /agendamentos"
Write-Host "     POST /assinaturas/checkout"
Write-Host "     DEL  /tenants/:id"
Write-Host ""
$fin = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "  Finalizado em: $fin" -ForegroundColor Cyan
Write-Host ""

exit $script:FAIL
