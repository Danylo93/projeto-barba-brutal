/**
 * Envio de e-mail pela API HTTP do Resend.
 *
 * Existe porque o Render bloqueia a saída nas portas de SMTP (25, 465 e 587)
 * nos serviços do plano free — a conexão com o smtp.gmail.com dava
 * "Connection timeout" e nenhum e-mail saía. A API do Resend fala HTTPS na
 * 443, que passa.
 *
 * Aqui ficam só as funções puras (montar o corpo, ler a resposta), para dar
 * para testar sem rede. Quem chama é o NotificacaoService.
 */

export const URL_RESEND = 'https://api.resend.com/emails';

export interface EnvioResend {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text: string;
}

/**
 * Monta o corpo do POST.
 *
 * O `from` precisa estar num domínio verificado no Resend. Com um endereço de
 * domínio não verificado a API responde 403 — e é por isso que a mensagem de
 * erro dela é repassada inteira em vez de virar um "falha ao enviar".
 */
export function corpoDoEnvio(dados: {
  de: string;
  para: string;
  assunto: string;
  texto: string;
  html?: string;
}): EnvioResend {
  return {
    from: dados.de,
    to: [dados.para],
    subject: dados.assunto,
    // Os dois: o texto puro é o que aparece na prévia da caixa de entrada e o
    // que o filtro de spam lê quando o cliente bloqueia HTML.
    text: dados.texto,
    ...(dados.html ? { html: dados.html } : {}),
  };
}

/**
 * Traduz a resposta da API para algo que dê para colocar no log.
 *
 * A mensagem do Resend é específica ("The barbeariabrutal.com domain is not
 * verified") e é justamente o que resolve o problema de quem está lendo o log;
 * trocar por texto genérico só esconderia a causa.
 */
export function interpretarResposta(
  status: number,
  corpo: any,
): { ok: boolean; id?: string; erro?: string } {
  if (status >= 200 && status < 300) {
    return { ok: true, id: corpo?.id };
  }
  const detalhe =
    corpo?.message ||
    corpo?.error?.message ||
    (typeof corpo === 'string' ? corpo : '') ||
    'sem detalhe';
  return { ok: false, erro: `Resend respondeu ${status}: ${detalhe}` };
}

/** Chave de API do Resend, quando configurada. */
export function chaveDoResend(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

/**
 * Remetente configurado, ou undefined.
 *
 * Não tem valor padrão de propósito. O endereço precisa estar num domínio
 * verificado no Resend, e chutar um domínio aqui só trocaria um erro claro
 * ("EMAIL_FROM não definido") por um 403 obscuro no meio do envio — ou, pior,
 * por e-mail saindo de um endereço que não é o da empresa.
 *
 * `SMTP_FROM` é aceito para não obrigar a mexer no que já está configurado.
 */
export function remetente(): string | undefined {
  return process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || undefined;
}

/** Mensagem única para quando falta o remetente, usada no envio e no health. */
export const SEM_REMETENTE =
  'EMAIL_FROM não definido. Use um endereço de um domínio verificado no ' +
  'Resend (ex.: contato@seudominio.com.br) — sem isso a API recusa o envio.';

/**
 * A chave é válida, só não tem permissão para o endpoint consultado?
 *
 * Chave do tipo "Sending access" envia e-mail mas não lista domínios. Como o
 * teste de conexão consulta a listagem, uma chave perfeitamente boa voltava
 * como quebrada — o diagnóstico acusava justamente o contrário do que era.
 * Uma chave inválida responde outra coisa ("API key is invalid"), então dá
 * para separar os dois casos.
 */
export function ehChaveSoDeEnvio(erro: string | undefined): boolean {
  return /restricted to only send/i.test(erro || '');
}

/**
 * Domínios que o Resend nunca vai aceitar como remetente: são públicos, e
 * verificação exige provar que o domínio é seu.
 *
 * Vale avisar antes de tentar enviar, porque o sintoma no ar é péssimo — o
 * e-mail simplesmente não chega, e o 403 fica só no log.
 */
const DOMINIOS_PUBLICOS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'bol.com.br',
  'uol.com.br',
  'terra.com.br',
];

/** Devolve o problema do remetente, ou undefined se ele estiver plausível. */
export function problemaDoRemetente(de: string | undefined): string | undefined {
  if (!de) return SEM_REMETENTE;

  // Aceita tanto "fulano@x.com" quanto "Nome <fulano@x.com>".
  const endereco = (/<([^>]+)>/.exec(de)?.[1] ?? de).trim().toLowerCase();
  const dominio = endereco.split('@')[1];
  if (!dominio) return `EMAIL_FROM não parece um e-mail válido: "${de}"`;

  if (DOMINIOS_PUBLICOS.includes(dominio)) {
    return (
      `EMAIL_FROM está em "${dominio}", que é um domínio público e não pode ` +
      'ser verificado no Resend — todo envio vai falhar com 403. Use um ' +
      'endereço de domínio próprio, ou onboarding@resend.dev para testar ' +
      '(este só entrega no e-mail dono da conta do Resend).'
    );
  }

  return undefined;
}
