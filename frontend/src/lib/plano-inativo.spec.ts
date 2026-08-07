import {
  deveAbrirOConvite,
  deveMostrarAFaixa,
  estaEmRotaDeResolucao,
} from './plano-inativo';

const base = {
  inativa: true,
  carregando: false,
  erro: false,
  rota: '/dashboard',
  dispensadoNaSessao: false,
};

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

describe('deveAbrirOConvite', () => {
  it('abre para quem está com o plano inativo', () => {
    expect(deveAbrirOConvite(base)).toBe(true);
  });

  it('não abre com o plano em dia', () => {
    expect(deveAbrirOConvite({ ...base, inativa: false })).toBe(false);
  });

  it('não pisca antes de saber a resposta da API', () => {
    expect(deveAbrirOConvite({ ...base, carregando: true })).toBe(false);
  });

  it('na dúvida não incomoda', () => {
    expect(deveAbrirOConvite({ ...base, erro: true })).toBe(false);
  });

  it('não abre por cima da tela de planos', () => {
    expect(deveAbrirOConvite({ ...base, rota: '/planos' })).toBe(false);
    expect(deveAbrirOConvite({ ...base, rota: '/assinatura' })).toBe(false);
  });

  it('depois do "agora não", não volta na cara da pessoa', () => {
    expect(deveAbrirOConvite({ ...base, dispensadoNaSessao: true })).toBe(false);
  });
});

describe('deveMostrarAFaixa', () => {
  it('a faixa fica mesmo depois de a pessoa fechar o modal', () => {
    // É o que sobra do convite: discreta, sempre à mão, sem atrapalhar.
    expect(deveMostrarAFaixa({ ...base, dispensadoNaSessao: true })).toBe(true);
  });

  it('some quando o plano volta a valer', () => {
    expect(deveMostrarAFaixa({ ...base, inativa: false })).toBe(false);
  });

  it('não aparece na tela de planos, onde seria redundante', () => {
    expect(deveMostrarAFaixa({ ...base, rota: '/planos' })).toBe(false);
  });

  it('não aparece enquanto carrega nem em caso de erro', () => {
    expect(deveMostrarAFaixa({ ...base, carregando: true })).toBe(false);
    expect(deveMostrarAFaixa({ ...base, erro: true })).toBe(false);
  });
});
