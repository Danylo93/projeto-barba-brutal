import {
  deveAbrirOConvite,
  deveMostrarAFaixa,
  estaEmRotaDeResolucao,
  textoDoConvite,
} from './plano-inativo';

/** Quem ainda não escolheu plano: acabou de se cadastrar. */
const NOVATA = {
  inativa: true,
  planoExpirado: false,
  carregando: false,
  erro: false,
  rota: '/dashboard',
  dispensadoNaSessao: false,
};

/** Quem já usou o teste inteiro (ou o plano venceu) e não comprou. */
const VENCIDA = { ...NOVATA, planoExpirado: true };

describe('estaEmRotaDeResolucao', () => {
  it('reconhece as telas onde a pessoa já está resolvendo', () => {
    expect(estaEmRotaDeResolucao('/planos')).toBe(true);
    expect(estaEmRotaDeResolucao('/assinatura')).toBe(true);
    expect(estaEmRotaDeResolucao('/assinatura/pagamento')).toBe(true);
  });

  it('o resto do painel não é rota de resolução', () => {
    expect(estaEmRotaDeResolucao('/dashboard')).toBe(false);
    expect(estaEmRotaDeResolucao('/agendamentos')).toBe(false);
    expect(estaEmRotaDeResolucao('')).toBe(false);
  });
});

describe('quem ainda não escolheu plano', () => {
  it('recebe o convite', () => {
    expect(deveAbrirOConvite(NOVATA)).toBe(true);
  });

  it('depois do "agora não", o convite não volta na mesma sessão', () => {
    // Está montando a barbearia. Modal a cada clique atrapalha justamente o
    // trabalho que faz ela querer ficar.
    expect(deveAbrirOConvite({ ...NOVATA, dispensadoNaSessao: true })).toBe(false);
  });
});

describe('quem já teve plano e ele venceu', () => {
  it('recebe o convite', () => {
    expect(deveAbrirOConvite(VENCIDA)).toBe(true);
  });

  it('o convite volta mesmo depois de ela ter fechado', () => {
    // O pedido explícito: já viu o produto inteiro e escolheu não pagar, então
    // continua sendo lembrada em cada tela até comprar.
    expect(deveAbrirOConvite({ ...VENCIDA, dispensadoNaSessao: true })).toBe(true);
  });

  it('mas continua fora das telas onde ela vai comprar', () => {
    expect(deveAbrirOConvite({ ...VENCIDA, rota: '/planos', dispensadoNaSessao: true })).toBe(false);
    expect(deveAbrirOConvite({ ...VENCIDA, rota: '/assinatura' })).toBe(false);
  });

  it('e para de aparecer assim que o plano volta a valer', () => {
    // "Depois que contratou, volta ao normal": é `inativa` que desliga tudo.
    expect(deveAbrirOConvite({ ...VENCIDA, inativa: false })).toBe(false);
    expect(deveMostrarAFaixa({ ...VENCIDA, inativa: false })).toBe(false);
  });
});

describe('em qualquer situação', () => {
  it('não pisca antes de saber a resposta da API', () => {
    expect(deveAbrirOConvite({ ...VENCIDA, carregando: true })).toBe(false);
    expect(deveAbrirOConvite({ ...NOVATA, carregando: true })).toBe(false);
  });

  it('na dúvida não incomoda', () => {
    expect(deveAbrirOConvite({ ...VENCIDA, erro: true })).toBe(false);
    expect(deveMostrarAFaixa({ ...VENCIDA, erro: true })).toBe(false);
  });
});

describe('deveMostrarAFaixa', () => {
  it('a faixa fica mesmo depois de a pessoa fechar o modal', () => {
    expect(deveMostrarAFaixa({ ...NOVATA, dispensadoNaSessao: true })).toBe(true);
    expect(deveMostrarAFaixa({ ...VENCIDA, dispensadoNaSessao: true })).toBe(true);
  });

  it('não aparece na tela de planos, onde seria redundante', () => {
    expect(deveMostrarAFaixa({ ...VENCIDA, rota: '/planos' })).toBe(false);
  });
});

describe('textoDoConvite', () => {
  it('fala de plano vencido para quem teve plano', () => {
    const t = textoDoConvite(true);
    expect(t.etiqueta).toMatch(/vencid/i);
    expect(t.titulo).toMatch(/acabou/i);
  });

  it('não cobra dívida de quem nunca teve plano', () => {
    // "Seu plano venceu" para quem nunca assinou parece cobrança de algo que
    // não existiu.
    const t = textoDoConvite(false);
    expect(t.titulo).not.toMatch(/venceu|acabou|expirou/i);
    expect(t.corpo).not.toMatch(/venceu|expirou/i);
  });

  it('os dois dizem que a barbearia continua funcionando', () => {
    // O medo real de quem vê este modal é ter perdido a agenda.
    expect(textoDoConvite(true).corpo).toMatch(/continua/i);
    expect(textoDoConvite(false).corpo).toMatch(/continua/i);
  });
});
