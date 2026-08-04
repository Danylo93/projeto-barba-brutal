/**
 * Slug da barbearia — o que vira `latita.barbeariabrutal.com`.
 *
 * Enquanto era só o final da URL (`/barbearia/latita`), valia qualquer coisa:
 * o dono gravava o que quisesse em `dominio`, sem validação nenhuma. Virando
 * subdomínio, o campo passa a decidir QUAL endereço da nossa marca a barbearia
 * ocupa — e aí "Barbearia WWW" viraria dona de `www.barbeariabrutal.com`.
 */

/**
 * Nomes que não podem virar barbearia.
 *
 * Três grupos, e todos doem de um jeito diferente:
 *
 * - Infraestrutura (`www`, `api`, `app`, `cdn`): quem pegar o slug passa a
 *   responder por um endereço que é nosso, ou que ainda vamos querer usar.
 * - E-mail (`mail`, `smtp`, `mx`, `autodiscover`, `_domainkey`): um subdomínio
 *   desses respondendo página quebra entrega e validação de e-mail.
 * - Confiança (`admin`, `login`, `conta`, `pagamento`, `suporte`, `seguranca`):
 *   são os endereços que um golpista escolheria para pedir senha e cartão em
 *   nome da marca. `suporte.barbeariabrutal.com` pedindo dados soa legítimo.
 */
export const SLUGS_RESERVADOS = new Set([
  // infraestrutura
  'www', 'api', 'app', 'admin', 'painel', 'dashboard', 'cdn', 'static',
  'assets', 'img', 'imagens', 'files', 'arquivos', 'dev', 'staging', 'test',
  'teste', 'homolog', 'beta', 'status', 'health', 'metrics', 'ns', 'ns1',
  'ns2', 'dns', 'vpn', 'ftp', 'ssh', 'git', 'webhook', 'webhooks', 'n8n',
  // e-mail
  'mail', 'email', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'mx1', 'mx2',
  'webmail', 'autodiscover', 'autoconfig', 'domainkey', 'dkim', 'spf',
  'dmarc', 'bounce', 'noreply', 'no-reply',
  // confiança e cobrança
  'login', 'entrar', 'signin', 'signup', 'cadastro', 'conta', 'contas',
  'senha', 'seguranca', 'security', 'suporte', 'support', 'ajuda', 'help',
  'atendimento', 'contato', 'pagamento', 'pagamentos', 'pay', 'checkout',
  'cobranca', 'financeiro', 'nota', 'boleto', 'pix', 'assinatura',
  'assinaturas', 'planos', 'billing',
  // institucional da nossa marca
  'barbeariabrutal', 'barbabrutal', 'blog', 'loja', 'shop', 'docs', 'doc',
  'sobre', 'termos', 'privacidade', 'lgpd', 'legal', 'imprensa', 'parceiros',
  'afiliados', 'indique',
]);

/** Tamanho mínimo — abaixo disso a URL não identifica ninguém. */
export const MIN_SLUG = 3;

/**
 * Máximo de 63 caracteres porque é o limite de um rótulo de DNS (RFC 1035).
 * Slug maior que isso simplesmente não resolve como subdomínio.
 */
export const MAX_SLUG = 63;

/** Deixa o texto no formato de rótulo de DNS: minúsculo, sem acento, com hífen. */
export function normalizarSlug(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
}

/**
 * Devolve a mensagem do problema, ou `null` quando o slug serve.
 *
 * Mensagem em vez de booleano porque isso vai para a tela do dono: "endereço
 * inválido" não diz o que fazer.
 */
export function problemaDoSlug(slug: string): string | null {
  if (!slug || slug.length < MIN_SLUG) {
    return `O endereço precisa de pelo menos ${MIN_SLUG} caracteres.`;
  }
  if (slug.length > MAX_SLUG) {
    return `O endereço pode ter no máximo ${MAX_SLUG} caracteres.`;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return 'Use apenas letras, números e hífen, começando e terminando com letra ou número.';
  }
  if (SLUGS_RESERVADOS.has(slug)) {
    return 'Este endereço é reservado pelo sistema. Escolha outro.';
  }
  return null;
}

/**
 * Rejeita antes de normalizar.
 *
 * `xn--` é o prefixo de domínio internacionalizado (punycode) e serve para
 * montar endereço que imita outro com letras parecidas. Não dá para tratar
 * isso depois de normalizar: a normalização junta `--` em `-` e o prefixo
 * some, virando um endereço qualquer em vez de um erro. Quem manda entrada
 * assim está tentando alguma coisa — melhor recusar do que consertar.
 */
export function problemaAntesDeNormalizar(bruto: unknown): string | null {
  const texto = String(bruto ?? '').trim().toLowerCase();
  if (texto.startsWith('xn--')) {
    return 'Este formato de endereço não é aceito. Use letras simples, números e hífen.';
  }
  return null;
}

/** Quantos endereços antigos ficam guardados por barbearia. */
export const MAX_ENDERECOS_ANTIGOS = 5;

/**
 * Guarda o endereço que sai de uso, mantendo a lista curta.
 *
 * Sem limite, trocar de endereço vira forma de cativar nome: cada troca
 * reserva o anterior para sempre, e bastaria trocar cem vezes para bloquear
 * cem endereços que ninguém mais poderia usar. Cinco cobre o caso real (mudou
 * o nome da barbearia, arrependeu-se da grafia) e descarta o mais velho.
 */
export function guardarEnderecoAntigo(
  antigos: string[] | null | undefined,
  saindo: string,
): string[] {
  const lista = (antigos ?? []).filter((e) => e && e !== saindo);
  return [...lista, saindo].slice(-MAX_ENDERECOS_ANTIGOS);
}

/** Atalho para quem só quer saber se pode usar. */
export function slugUtilizavel(slug: string): boolean {
  return problemaDoSlug(slug) === null;
}

/**
 * Monta um slug válido a partir do nome da barbearia, sem colidir com o que
 * já existe nem com a lista de reservados.
 *
 * `jaUsado` é injetado para esta função continuar pura e testável — quem sabe
 * consultar o banco é o serviço.
 */
export async function slugDisponivel(
  nome: string,
  jaUsado: (slug: string) => Promise<boolean>,
): Promise<string> {
  let base = normalizarSlug(nome);
  if (base.length < MIN_SLUG) base = 'barbearia';

  // Reservado não vira sufixo à toa: "mail" precisa virar "mail-1", e não
  // continuar tentando "mail" para sempre.
  let candidato = base;
  let contador = 1;
  while (!slugUtilizavel(candidato) || (await jaUsado(candidato))) {
    candidato = `${base}-${contador}`.slice(0, MAX_SLUG).replace(/-+$/, '');
    contador++;
    if (contador > 1000) {
      // Nunca deve acontecer; melhor um endereço feio do que um laço infinito
      // no meio de um cadastro.
      candidato = `barbearia-${Date.now()}`;
      break;
    }
  }
  return candidato;
}
