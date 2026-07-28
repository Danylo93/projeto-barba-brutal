import {
  corpoDaAssinatura,
  corpoDoPlano,
  interpretarNotificacao,
  lerReferenciaExterna,
  referenciaExterna,
  traduzirStatus,
} from './mercadopago-assinatura';

const plano = {
  id: 2,
  nome: 'Profissional',
  descricao: 'Para barbearias em crescimento',
  preco: 99.9,
};

describe('corpoDoPlano', () => {
  const corpo = corpoDoPlano(plano, 'https://barbeariabrutal.vercel.app/assinatura');

  it('cobra mensalmente em reais', () => {
    expect(corpo.auto_recurring.frequency).toBe(1);
    expect(corpo.auto_recurring.frequency_type).toBe('months');
    expect(corpo.auto_recurring.currency_id).toBe('BRL');
  });

  it('leva o valor do plano com 2 casas', () => {
    expect(corpo.auto_recurring.transaction_amount).toBe(99.9);
    expect(corpoDoPlano({ ...plano, preco: 49.899 }, 'x').auto_recurring.transaction_amount).toBe(
      49.9,
    );
  });

  it('mantém os 30 dias de teste que a landing promete', () => {
    expect(corpo.auto_recurring.free_trial).toEqual({
      frequency: 30,
      frequency_type: 'days',
    });
  });

  it('identifica o plano no extrato do assinante', () => {
    expect(corpo.reason).toContain('Profissional');
  });

  it('não restringe meios de pagamento', () => {
    // Restringir só tiraria opção do assinante: sem o campo, o Mercado Pago
    // oferece tudo que a conta tem habilitado (cartão, débito, saldo, Pix).
    expect(corpo).not.toHaveProperty('payment_methods_allowed');
  });
});

describe('corpoDaAssinatura', () => {
  const primeiraCobranca = new Date('2026-08-27T12:00:00.000Z');
  const corpo = corpoDaAssinatura({
    plano,
    emailDoPagador: 'contato@barbearia.app',
    tenantId: 7,
    backUrl: 'https://barbeariabrutal.vercel.app/assinatura',
    primeiraCobranca,
  });

  it('nasce pendente, para o assinante autorizar no Mercado Pago', () => {
    expect(corpo.status).toBe('pending');
  });

  it('não manda dados de cartão nem plano associado', () => {
    // Com preapproval_plan_id a API exigiria card_token_id — só cartão, e com
    // os dados do cartão passando por aqui. Sem ele, o Mercado Pago devolve o
    // init_point e o barbeiro escolhe cartão ou Pix na tela deles.
    expect(corpo).not.toHaveProperty('card_token_id');
    expect(corpo).not.toHaveProperty('preapproval_plan_id');
  });

  it('leva a recorrência embutida', () => {
    expect(corpo.auto_recurring.frequency).toBe(1);
    expect(corpo.auto_recurring.frequency_type).toBe('months');
    expect(corpo.auto_recurring.transaction_amount).toBe(99.9);
    expect(corpo.auto_recurring.currency_id).toBe('BRL');
  });

  it('só cobra quando o teste termina', () => {
    expect(corpo.auto_recurring.start_date).toBe(primeiraCobranca.toISOString());
  });

  it('amarra a assinatura ao tenant e ao plano', () => {
    expect(corpo.external_reference).toBe('bb-7-2');
  });
});

describe('referência externa', () => {
  it('vai e volta', () => {
    expect(lerReferenciaExterna(referenciaExterna(12, 3))).toEqual({
      tenantId: 12,
      planoId: 3,
    });
  });

  it('recusa formato estranho em vez de devolver lixo', () => {
    for (const v of ['', null, undefined, 'bb-x-1', 'YG-1234', 'bb-1', 'bb-1-2-3']) {
      expect(lerReferenciaExterna(v as any)).toBeNull();
    }
  });
});

describe('interpretarNotificacao', () => {
  it('lê o formato com type + data.id', () => {
    expect(
      interpretarNotificacao({ type: 'subscription_preapproval', data: { id: 'abc' } }),
    ).toEqual({ topico: 'subscription_preapproval', id: 'abc' });
  });

  it('lê o formato antigo com topic + id', () => {
    expect(interpretarNotificacao({ topic: 'payment', id: 123 })).toEqual({
      topico: 'payment',
      id: '123',
    });
  });

  it('lê o tópico e o id vindos da query string', () => {
    expect(
      interpretarNotificacao({}, { topic: 'subscription_authorized_payment', 'data.id': 'p9' }),
    ).toEqual({ topico: 'subscription_authorized_payment', id: 'p9' });
  });

  it('devolve tópico nulo para o que não sabemos tratar', () => {
    // Melhor ignorar explicitamente do que processar como se fosse pagamento.
    expect(interpretarNotificacao({ type: 'merchant_order', data: { id: '1' } }).topico).toBeNull();
  });

  it('não quebra com corpo vazio', () => {
    expect(interpretarNotificacao({})).toEqual({ topico: null, id: null });
    expect(interpretarNotificacao(null)).toEqual({ topico: null, id: null });
  });
});

describe('traduzirStatus', () => {
  it('só authorized vale como assinatura ativa', () => {
    expect(traduzirStatus('authorized')).toBe('active');
  });

  it('pausada e cancelada viram cancelada', () => {
    expect(traduzirStatus('paused')).toBe('canceled');
    expect(traduzirStatus('cancelled')).toBe('canceled');
  });

  it('pending NÃO libera o sistema', () => {
    // "pending" no MP é "criada, esperando autorizar" — tratar como ativa
    // liberaria o sistema de graça para quem nunca autorizou.
    expect(traduzirStatus('pending')).toBe('pending');
    expect(traduzirStatus('')).toBe('pending');
    expect(traduzirStatus('qualquer_coisa_nova')).toBe('pending');
  });
});
