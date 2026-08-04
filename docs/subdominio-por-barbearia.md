# Subdomínio por barbearia (`latita.barbeariabrutal.com`)

Cada barbearia ganha um endereço próprio dentro da nossa marca, **sem nenhuma
ação por contratação**. Não existe "criar subdomínio": entra um domínio
curinga na Vercel, uma vez, e qualquer subdomínio já cai no app.

## Como funciona

1. No cadastro, `registerTenant` gera o slug a partir do nome da barbearia
   (`slugDisponivel`, em `backend/src/tenant/slug.ts`) e grava em
   `tenant.dominio`. Isso já acontecia antes desta mudança.
2. `frontend/src/middleware.ts` lê o cabeçalho `Host`, extrai o slug e
   **reescreve** a requisição para `/barbearia/<slug>`. Reescrita, não
   redirecionamento: a barra de endereço continua mostrando o subdomínio, que
   é o que a barbearia divulga.
3. A página pública procura pelo slug atual **e pelos antigos**
   (`tenant.dominiosAntigos`), então trocar de endereço não mata QR code
   impresso nem link na bio.

Variável necessária no frontend:

```
NEXT_PUBLIC_DOMINIO_RAIZ=barbeariabrutal.com
```

Sem ela o middleware não faz nada — nenhum Host é tratado como subdomínio de
barbearia. É proposital: em preview da Vercel e em `localhost` o
comportamento antigo (`/barbearia/latita`) continua valendo.

## Configuração na Vercel

Uma vez só:

1. No projeto, adicione o domínio `*.barbeariabrutal.com`.
2. Aponte o domínio para os nameservers da Vercel:
   `ns1.vercel-dns.com` e `ns2.vercel-dns.com`.
3. Defina `NEXT_PUBLIC_DOMINIO_RAIZ` nas variáveis de ambiente do projeto.

O passo 2 não é opcional: para emitir o certificado curinga a Vercel usa o
desafio DNS-01, que exige que ela consiga escrever um registro TXT no domínio.
Um `CNAME` curinga apontado de outro provedor até roteia o tráfego, mas o
certificado nunca sai — e toda página de barbearia abre com erro de segurança.

### Antes de trocar o nameserver, salve o e-mail

Trocar o nameserver move **todo** o DNS para a Vercel. Os registros que ficaram
para trás simplesmente deixam de existir — inclusive os de e-mail.

Em agosto/2026 o domínio estava assim (registrado na Hostinger):

| Tipo | Valor |
|---|---|
| NS | `horizon.dns-parking.com`, `orbit.dns-parking.com` |
| A | `216.198.79.1` (já apontando para a Vercel) |
| MX | `mx1.hostinger.com` (5), `mx2.hostinger.com` (10) |
| TXT | `v=spf1 include:_spf.mail.hostinger.com ~all` |

**Ordem certa:** crie os MX e o TXT no DNS da Vercel **primeiro**, e só então
troque o nameserver na Hostinger. Assim, durante as horas de propagação, o DNS
velho e o novo respondem a mesma coisa e não há janela sem e-mail. Copie a zona
inteira do painel da Hostinger antes de mexer — inclusive DKIM e DMARC, que não
dá para descobrir de fora sem saber o seletor.

A caixa postal e o login no webmail continuam na Hostinger de qualquer jeito; o
que o MX define é para onde os outros servidores entregam.

## Endereços reservados

`backend/src/tenant/slug.ts` mantém a lista. Três grupos, cada um com um estrago
diferente:

- **Infraestrutura** (`www`, `api`, `app`, `cdn`): entregaria um endereço nosso.
- **E-mail** (`mail`, `smtp`, `mx1`, `autodiscover`, `dkim`): quebraria entrega
  e validação de e-mail do domínio.
- **Confiança** (`login`, `conta`, `suporte`, `pagamento`, `seguranca`): são os
  endereços que um golpista escolheria para pedir senha em nome da marca.

Antes desta mudança o campo não tinha validação nenhuma: "Barbearia WWW"
recebia o slug `www` calado, e o dono podia gravar o que quisesse em `dominio`.

## Troca de endereço

O dono pode trocar. O anterior fica em `dominiosAntigos` e continua encontrando
a barbearia. São guardados os **5 últimos** — sem teto, trocar de endereço
viraria forma de cativar nome: cada troca reserva o anterior para sempre.

## Domínio próprio da barbearia (`latita.com.br`)

É outro assunto, e é o adicional pago. Aí sim precisa de uma chamada por
cliente na API da Vercel para registrar o domínio, e a barbearia precisa
apontar o DNS dela. Limites da Vercel: 50 domínios no plano Hobby, sem limite
prático no Pro, com 100 adições de domínio por hora.
