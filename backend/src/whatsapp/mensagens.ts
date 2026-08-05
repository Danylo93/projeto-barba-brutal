/**
 * Textos das mensagens de WhatsApp.
 *
 * Separados do serviço porque quem escreve o texto não é quem cuida do envio,
 * e porque mensagem que chega no celular de um cliente merece ser revisada
 * sem precisar abrir código de infraestrutura.
 */

const dinheiro = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Dados de um agendamento, já formatados para leitura humana. */
export interface DadosDoAviso {
  cliente: string;
  barbeiro: string;
  barbearia: string;
  /** "Corte, Barba" — nomes já concatenados. */
  servicos: string;
  /** dd/mm/aaaa no fuso de Brasília. */
  data: string;
  /** HH:MM no fuso de Brasília. */
  horario: string;
}

/**
 * Solicitação, logo depois de agendar.
 *
 * O cliente e o barbeiro recebem um aviso inicial de que a solicitação
 * foi registrada, e que estão aguardando a confirmação oficial no sistema.
 */
export function mensagemSolicitacaoCliente(a: DadosDoAviso): string {
  return [
    `⏳ *Solicitação de agendamento recebida!*`,
    ``,
    `Olá, ${a.cliente}! Seu horário na *${a.barbearia}* foi pré-agendado e está aguardando confirmação do barbeiro:`,
    ``,
    `✂️ ${a.servicos}`,
    `👤 ${a.barbeiro}`,
    `📅 ${a.data}`,
    `🕐 ${a.horario}`,
    ``,
    `Avisaremos assim que for confirmado! 🪒`,
  ].join('\n');
}

export function mensagemSolicitacaoBarbeiro(a: DadosDoAviso): string {
  return [
    `📅 *Nova solicitação de agendamento!*`,
    ``,
    `${a.barbeiro}, você tem uma solicitação de horário na *${a.barbearia}*:`,
    ``,
    `👤 Cliente: ${a.cliente}`,
    `✂️ ${a.servicos}`,
    `📅 ${a.data}`,
    `🕐 ${a.horario}`,
    ``,
    `Acesse sua agenda para *confirmar* o horário.`,
  ].join('\n');
}

/**
 * Confirmação real, enviada quando o barbeiro aprova na agenda.
 */
export function mensagemConfirmacaoCliente(a: DadosDoAviso): string {
  return [
    `✅ *Agendamento confirmado!*`,
    ``,
    `Olá, ${a.cliente}! O barbeiro confirmou o seu horário na *${a.barbearia}*:`,
    ``,
    `✂️ ${a.servicos}`,
    `👤 ${a.barbeiro}`,
    `📅 ${a.data}`,
    `🕐 ${a.horario}`,
    ``,
    `Qualquer imprevisto, é só chamar por aqui. Até logo! 🪒`,
  ].join('\n');
}

/**
 * Lembrete, cerca de uma hora antes.
 *
 * Não diz "hoje": o lembrete pode sair atrasado depois de uma falha de envio,
 * e o fluxo antigo escrevia "Hoje às 20:00" para um horário que podia já ter
 * passado. A data por extenso é o que o cliente precisa para não se enganar.
 */
export function mensagemLembreteCliente(a: DadosDoAviso): string {
  return [
    `⏰ *Lembrete do seu horário*`,
    ``,
    `Olá, ${a.cliente}! Está chegando a hora do seu horário na *${a.barbearia}*:`,
    ``,
    `✂️ ${a.servicos}`,
    `👤 ${a.barbeiro}`,
    `📅 ${a.data} às ${a.horario}`,
    ``,
    `Te esperamos! 🪒`,
  ].join('\n');
}

export function mensagemLembreteBarbeiro(a: DadosDoAviso): string {
  return [
    `⏰ *Lembrete de atendimento*`,
    ``,
    `${a.barbeiro}, está chegando:`,
    ``,
    `👤 Cliente: ${a.cliente}`,
    `✂️ ${a.servicos}`,
    `📅 ${a.data} às ${a.horario}`,
  ].join('\n');
}

const dia = (d: Date) =>
  d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/**
 * Confirmação de plano contratado. O barbeiro acabou de escolher e quer ver
 * preto no branco o que pegou, até quando é grátis e o que fazer agora.
 */
export function mensagemPlanoContratado(dados: {
  nomeBarbearia: string;
  nomePlano: string;
  preco: number;
  fimDoTeste: Date;
  emTeste: boolean;
}): string {
  const { nomeBarbearia, nomePlano, preco, fimDoTeste, emTeste } = dados;

  if (emTeste) {
    return [
      `Fechado, ${nomeBarbearia}! 💈`,
      ``,
      `Plano: *${nomePlano}*`,
      `Valor: ${dinheiro(preco)}/mês`,
      `Teste grátis até *${dia(fimDoTeste)}* — sem cartão, sem cobrança.`,
      ``,
      `Enquanto isso o sistema está liberado por inteiro. O melhor primeiro passo é cadastrar seus serviços e sua equipe: aí sua agenda já começa a receber cliente.`,
      ``,
      `Qualquer dúvida, é só responder aqui.`,
    ].join('\n');
  }

  return [
    `Plano ativado, ${nomeBarbearia}! 💈`,
    ``,
    `Plano: *${nomePlano}*`,
    `Valor: ${dinheiro(preco)}/mês`,
    `Válido até *${dia(fimDoTeste)}*`,
    ``,
    `Obrigado por continuar com a gente.`,
  ].join('\n');
}
