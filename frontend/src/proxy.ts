import { NextRequest, NextResponse } from 'next/server'

/**
 * Resolve o subdomínio da barbearia.
 *
 * O arquivo chamava `middleware.ts` até o Next 16, que renomeou a convenção
 * para `proxy.ts`. É o mesmo código no mesmo lugar do ciclo — só o nome mudou.
 *
 * `latita.barbeariabrutal.com/agendamento` passa a servir o mesmo conteúdo de
 * `/barbearia/latita/agendamento`, sem redirecionar — a pessoa nunca vê o
 * caminho interno.
 *
 * Não existe "criar subdomínio" em lugar nenhum: na Vercel entra UM domínio
 * curinga (`*.barbeariabrutal.com`) e qualquer subdomínio já cai aqui. O slug
 * de cada barbearia já é gerado no cadastro, então uma barbearia nova ganha
 * endereço próprio sem ninguém apertar nada.
 */

/** Onde o app vive. Sem isso não há como saber o que é subdomínio. */
const DOMINIO_RAIZ = process.env.NEXT_PUBLIC_DOMINIO_RAIZ || ''

/**
 * Subdomínios que são do sistema, não de barbearia.
 *
 * Espelha a lista de `backend/src/tenant/slug.ts` só no que chega até aqui: o
 * backend impede que virem slug, esta lista impede que sejam interpretados
 * como barbearia caso já existam no DNS.
 */
const NAO_SAO_BARBEARIA = new Set(['www', 'app', 'api', 'admin', 'painel'])

/** Caminhos que nunca pertencem à página pública de uma barbearia. */
const CAMINHOS_DO_SISTEMA = [
  '/api',
  '/_next',
  '/admin',
  '/dashboard',
  '/login',
  '/entrar',
  '/register',
  '/recuperar-senha',
  '/redefinir-senha',
  '/agendamento',
  '/agendamentos',
  '/agenda',
  '/api-key',
  '/assinatura',
  '/clientes',
  '/clube',
  '/configuracoes',
  '/financas',
  '/marketing',
  '/meus-dados',
  '/planos',
  '/profissionais',
  '/servicos',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

export function proxy(request: NextRequest) {
  const url = request.nextUrl

  if (CAMINHOS_DO_SISTEMA.some((c) => url.pathname.startsWith(c))) {
    return NextResponse.next()
  }

  const slug = slugDoHost(request.headers.get('host'))
  if (!slug) return NextResponse.next()

  // Reescrita, não redirecionamento: a barra de endereço continua mostrando
  // latita.barbeariabrutal.com, que é o endereço que a barbearia divulga.
  const destino = new URL(url)
  destino.pathname = `/barbearia/${slug}${url.pathname === '/' ? '' : url.pathname}`
  return NextResponse.rewrite(destino)
}

/** Extrai o slug da barbearia do cabeçalho Host, ou `null` se não houver. */
export function slugDoHost(host: string | null): string | null {
  if (!host || !DOMINIO_RAIZ) return null

  // A porta atrapalha a comparação em desenvolvimento (`localhost:3000`).
  const limpo = host.split(':')[0].toLowerCase()
  const raiz = DOMINIO_RAIZ.toLowerCase()

  if (limpo === raiz || limpo === `www.${raiz}`) return null
  if (!limpo.endsWith(`.${raiz}`)) return null

  const prefixo = limpo.slice(0, -(raiz.length + 1))
  // Só um nível: `a.b.barbeariabrutal.com` não é barbearia nenhuma.
  if (!prefixo || prefixo.includes('.')) return null
  if (NAO_SAO_BARBEARIA.has(prefixo)) return null
  // Mesmo formato que o backend aceita como slug. Qualquer coisa fora disso
  // não pode virar caminho: é entrada de fora, e vai montar uma URL.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(prefixo)) return null

  return prefixo
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - all files with common image extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
