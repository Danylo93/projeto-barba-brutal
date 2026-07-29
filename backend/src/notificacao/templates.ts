/**
 * Templates de e-mail.
 *
 * HTML de e-mail não é HTML de site: cliente de e-mail ignora folha de estilo
 * externa, flexbox e grid. Por isso aqui é tabela com estilo inline — feio de
 * escrever, mas é o que chega igual no Gmail, no Outlook e no celular.
 *
 * Todo template devolve `{ assunto, html, texto }`. O texto puro não é enfeite:
 * é o que aparece na prévia da caixa de entrada e o que o filtro de spam lê
 * quando o cliente bloqueia imagens.
 */

export interface Email {
  assunto: string;
  html: string;
  texto: string;
}

const AMARELO = '#facc15';
const FUNDO = '#18181b';
const CARTAO = '#27272a';
const TEXTO = '#e4e4e7';
const APAGADO = '#a1a1aa';

const dinheiro = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dia = (d: Date) =>
  d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Escapa o que vem do usuário — nome de barbearia com "&" não pode quebrar o HTML. */
function esc(valor: string | number | undefined | null): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Moldura comum: cabeçalho, corpo e rodapé. */
function moldura(conteudo: string, rodapeExtra = ''): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:${FUNDO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARTAO};border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
    <tr><td style="padding:28px 28px 0;">
      <div style="font-size:20px;font-weight:bold;color:${AMARELO};letter-spacing:.5px;">BARBEARIA BRUTAL</div>
    </td></tr>
    <tr><td style="padding:20px 28px 28px;color:${TEXTO};font-size:15px;line-height:1.6;">
      ${conteudo}
    </td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #3f3f46;color:${APAGADO};font-size:12px;line-height:1.5;">
      ${rodapeExtra ? `${rodapeExtra}<br><br>` : ''}
      Você recebeu este e-mail porque tem uma conta no Barbearia Brutal.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function botao(texto: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
    <tr><td style="background:${AMARELO};border-radius:10px;">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 26px;color:#18181b;font-weight:bold;font-size:15px;text-decoration:none;">${esc(texto)}</a>
    </td></tr></table>`;
}

/* ─────────────────────────── recuperação de senha ─────────────────────────── */

export function emailRecuperacaoSenha(dados: {
  nome: string;
  link: string;
  validadeMinutos: number;
}): Email {
  const { nome, link, validadeMinutos } = dados;
  return {
    assunto: 'Redefinir sua senha — Barbearia Brutal',
    html: moldura(
      `<p style="margin:0 0 14px;">Olá, <strong>${esc(nome)}</strong>.</p>
       <p style="margin:0 0 6px;">Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo para criar uma nova:</p>
       ${botao('Criar nova senha', link)}
       <p style="margin:0 0 14px;color:${APAGADO};font-size:13px;">
         O link vale por ${validadeMinutos} minutos e só funciona uma vez.
       </p>
       <p style="margin:0 0 6px;color:${APAGADO};font-size:13px;">
         Se o botão não abrir, copie este endereço no navegador:<br>
         <span style="color:${TEXTO};word-break:break-all;">${esc(link)}</span>
       </p>`,
      `<strong style="color:${TEXTO};">Não foi você quem pediu?</strong> Ignore este e-mail — sua senha continua a mesma e ninguém teve acesso à sua conta.`,
    ),
    texto: [
      `Olá, ${nome}.`,
      '',
      'Recebemos um pedido para redefinir a sua senha. Abra o link abaixo:',
      link,
      '',
      `O link vale por ${validadeMinutos} minutos e só funciona uma vez.`,
      'Se não foi você quem pediu, ignore este e-mail — sua senha continua a mesma.',
    ].join('\n'),
  };
}

/* ──────────────────────────── plano contratado ──────────────────────────── */

export function emailPlanoContratado(dados: {
  nomeBarbearia: string;
  nomePlano: string;
  preco: number;
  validoAte: Date;
  emTeste: boolean;
  urlPainel: string;
}): Email {
  const { nomeBarbearia, nomePlano, preco, validoAte, emTeste, urlPainel } = dados;

  const linhas = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #3f3f46;border-radius:12px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #3f3f46;">
        <span style="color:${APAGADO};font-size:13px;">Plano</span><br>
        <strong style="font-size:16px;">${esc(nomePlano)}</strong>
      </td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #3f3f46;">
        <span style="color:${APAGADO};font-size:13px;">Valor</span><br>
        <strong style="font-size:16px;">${dinheiro(preco)}/mês</strong>
      </td></tr>
      <tr><td style="padding:14px 16px;">
        <span style="color:${APAGADO};font-size:13px;">${emTeste ? 'Teste grátis até' : 'Válido até'}</span><br>
        <strong style="font-size:16px;color:${AMARELO};">${dia(validoAte)}</strong>
      </td></tr>
    </table>`;

  if (emTeste) {
    return {
      assunto: `Teste liberado — plano ${nomePlano}`,
      html: moldura(
        `<p style="margin:0 0 14px;">Fechado, <strong>${esc(nomeBarbearia)}</strong>! 💈</p>
         <p style="margin:0;">Seu teste está valendo e o sistema está liberado por inteiro — sem cartão, sem cobrança até lá.</p>
         ${linhas}
         <p style="margin:0 0 4px;"><strong>O melhor primeiro passo:</strong></p>
         <p style="margin:0 0 14px;color:${APAGADO};">
           Cadastre seus serviços e sua equipe. É o que faz sua agenda começar a receber cliente.
         </p>
         ${botao('Abrir meu painel', urlPainel)}`,
        'Dúvida? Responda este e-mail que a gente te ajuda.',
      ),
      texto: [
        `Fechado, ${nomeBarbearia}!`,
        '',
        `Plano: ${nomePlano}`,
        `Valor: ${dinheiro(preco)}/mês`,
        `Teste grátis até ${dia(validoAte)} — sem cartão, sem cobrança.`,
        '',
        'O sistema está liberado por inteiro. O melhor primeiro passo é cadastrar seus serviços e sua equipe.',
        urlPainel,
      ].join('\n'),
    };
  }

  return {
    assunto: `Pagamento confirmado — plano ${nomePlano}`,
    html: moldura(
      `<p style="margin:0 0 14px;">Pagamento confirmado, <strong>${esc(nomeBarbearia)}</strong>! 💈</p>
       <p style="margin:0;">Sua assinatura está ativa. Obrigado por continuar com a gente.</p>
       ${linhas}
       ${botao('Abrir meu painel', urlPainel)}`,
      'Precisa da nota ou quer trocar de plano? É só responder este e-mail.',
    ),
    texto: [
      `Pagamento confirmado, ${nomeBarbearia}!`,
      '',
      `Plano: ${nomePlano}`,
      `Valor: ${dinheiro(preco)}/mês`,
      `Válido até ${dia(validoAte)}`,
      '',
      urlPainel,
    ].join('\n'),
  };
}

/* ───────────────────────── boas-vindas no cadastro ───────────────────────── */

export function emailBoasVindas(dados: {
  nomeBarbearia: string;
  urlPlanos: string;
}): Email {
  const { nomeBarbearia, urlPlanos } = dados;
  return {
    assunto: 'Sua barbearia está cadastrada',
    html: moldura(
      `<p style="margin:0 0 14px;">Bem-vindo, <strong>${esc(nomeBarbearia)}</strong>! 💈</p>
       <p style="margin:0 0 14px;">Sua conta está criada. Falta um passo para liberar o sistema: escolher o plano e começar o teste de 30 dias.</p>
       ${botao('Escolher meu plano', urlPlanos)}
       <p style="margin:0;color:${APAGADO};font-size:13px;">
         São 30 dias grátis, sem cartão. Você só decide sobre pagamento no fim do teste.
       </p>`,
    ),
    texto: [
      `Bem-vindo, ${nomeBarbearia}!`,
      '',
      'Sua conta está criada. Falta escolher o plano para liberar o sistema e começar o teste de 30 dias.',
      urlPlanos,
      '',
      'São 30 dias grátis, sem cartão.',
    ].join('\n'),
  };
}

/* ──────────────────────── agendamento para o cliente ──────────────────────── */

export function emailAgendamentoConfirmado(dados: {
  nomeCliente: string;
  nomeBarbearia: string;
  servicos: string;
  profissional: string;
  quando: Date;
  endereco?: string | null;
}): Email {
  const { nomeCliente, nomeBarbearia, servicos, profissional, quando, endereco } = dados;
  const data = quando.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const hora = quando.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    assunto: `Agendamento confirmado — ${data} às ${hora}`,
    html: moldura(
      `<p style="margin:0 0 14px;">Olá, <strong>${esc(nomeCliente)}</strong>. Seu horário na <strong>${esc(nomeBarbearia)}</strong> está confirmado.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #3f3f46;border-radius:12px;">
         <tr><td style="padding:16px;">
           <div style="font-size:26px;font-weight:bold;color:${AMARELO};">${esc(data)} — ${esc(hora)}</div>
           <div style="margin-top:10px;color:${APAGADO};font-size:14px;">
             ${esc(servicos)}<br>com ${esc(profissional)}
             ${endereco ? `<br><br>${esc(endereco)}` : ''}
           </div>
         </td></tr>
       </table>
       <p style="margin:0;color:${APAGADO};font-size:13px;">
         Precisa remarcar ou cancelar? Fale com a barbearia — quanto antes avisar, melhor para todo mundo.
       </p>`,
    ),
    texto: [
      `Olá, ${nomeCliente}.`,
      '',
      `Seu horário na ${nomeBarbearia} está confirmado:`,
      `${data} às ${hora}`,
      `${servicos} com ${profissional}`,
      ...(endereco ? ['', endereco] : []),
      '',
      'Precisa remarcar ou cancelar? Fale com a barbearia.',
    ].join('\n'),
  };
}
