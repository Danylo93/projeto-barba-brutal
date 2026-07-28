/**
 * Textos das mensagens de WhatsApp.
 *
 * Separados do serviço porque quem escreve o texto não é quem cuida do envio,
 * e porque mensagem que chega no celular de um cliente merece ser revisada
 * sem precisar abrir código de infraestrutura.
 */

const dinheiro = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
