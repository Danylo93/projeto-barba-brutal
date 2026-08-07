/**
 * Textos das mensagens de WhatsApp.
 *
 * Separados do serviço porque quem escreve o texto não é quem cuida do envio,
 * e porque mensagem que chega no celular de um cliente merece ser revisada
 * sem precisar abrir código de infraestrutura.
 */

import { DIAS_TESTE_GRATIS } from '../assinatura/teste-gratis';

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

/**
 * Convite de retorno depois de um serviço realmente concluído.
 *
 * Não promete desconto nem horário e não finge ser lembrete do agendamento.
 * O texto identifica o serviço que originou o contato e mostra como revogar
 * este tipo de comunicação.
 */
export function mensagemLembreteRetorno(dados: {
  cliente: string;
  barbearia: string;
  servicos: string;
  dias: number;
}): string {
  return [
    `✂️ *Está na hora de cuidar do visual?*`,
    ``,
    `Olá, ${dados.cliente}! Já faz ${dados.dias} dias desde seu último atendimento de *${dados.servicos}* na *${dados.barbearia}*.`,
    ``,
    `Quando quiser refazer o serviço, é só chamar por aqui para consultar os horários.`,
    ``,
    `Você pode desativar estes lembretes a qualquer momento em *Meus dados* no aplicativo.`,
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
      `Plano escolhido para depois do teste: *${nomePlano}*`,
      `Acesso durante o teste: *Premium*`,
      `Valor: ${dinheiro(preco)}/mês`,
      `Teste grátis até *${dia(fimDoTeste)}* — sem cartão, sem cobrança.`,
      ``,
      `Durante os ${DIAS_TESTE_GRATIS} dias, todos os recursos Premium ficam liberados. O melhor primeiro passo é cadastrar seus serviços e sua equipe: aí sua agenda já começa a receber cliente.`,
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

export type TipoAvisoAssinatura = 'vence_amanha' | 'expirou';

/** Aviso operacional do SaaS para o dono da barbearia. */
export function mensagemAvisoAssinatura(dados: {
  nomeBarbearia: string;
  nomePlano: string;
  dataFim: Date;
  emTeste: boolean;
  tipo: TipoAvisoAssinatura;
  urlPlanos: string;
}): string {
  const { nomeBarbearia, nomePlano, dataFim, emTeste, tipo, urlPlanos } = dados;
  const origem = emTeste ? 'Seu teste grátis com acesso Premium' : `Seu plano ${nomePlano}`;

  if (tipo === 'vence_amanha') {
    return [
      `⏰ *${origem} vence amanhã*`,
      ``,
      `Olá, ${nomeBarbearia}! A validade termina em *${dia(dataFim)}*.` ,
      `Escolha ou confirme um plano para não interromper sua agenda e suas ferramentas.`,
      ``,
      urlPlanos,
    ].join('\n');
  }

  return [
    `🔒 *${origem} expirou*`,
    ``,
    `Olá, ${nomeBarbearia}! A validade terminou em *${dia(dataFim)}* e o painel foi pausado. Seus dados continuam guardados.`,
    ``,
    `Escolha um plano para liberar o acesso novamente:`,
    urlPlanos,
  ].join('\n');
}
