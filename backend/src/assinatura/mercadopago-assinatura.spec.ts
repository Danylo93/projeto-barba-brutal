import {
  corpoDaAssinatura,
  corpoDoPlano,
  interpretarNotificacao,
  lerReferenciaExterna,
  pagamentoRenovaPlano,
  recorrenciaDoPlano,
  referenciaExterna,
  traduzirStatus,
} from './mercadopago-assinatura';
import { DIAS_TESTE_GRATIS } from './teste-gratis';

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

  it('o teste antes da primeira cobrança é o mesmo que a landing promete', () => {
    // Amarrado à constante de propósito. Com o número digitado aqui, mudar o
    // prazo do teste passava neste teste e deixava a cobrança do Mercado Pago
    // cair num dia diferente do que a landing prometeu — o cliente descobriria
    // pela fatura.
    expect(corpo.auto_recurring.free_trial).toEqual({
      frequency: DIAS_TESTE_GRATIS,
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

describe('de quanto em quanto tempo o Mercado Pago cobra', () => {
  const anual = { ...plano, id: 6, nome: 'Profissional Anual', preco: 699, duracao: 365 };
  const mensal = { ...plano, duracao: 30 };

  it('o plano anual é cobrado uma vez por ano', () => {
    // Sem isto, a recorrência fixa de 1 mês cobraria os R$ 699 do ano
    // TODA VEZ que o mês virasse. Doze vezes, no cartão de quem confiou.
    expect(recorrenciaDoPlano(anual)).toEqual({ frequency: 12, frequency_type: 'months' });
    expect(corpoDoPlano(anual, 'x').auto_recurring.frequency).toBe(12);
  });

  it('o mensal continua mensal', () => {
    expect(recorrenciaDoPlano(mensal)).toEqual({ frequency: 1, frequency_type: 'months' });
  });

  it('plano sem duração declarada é tratado como mensal', () => {
    // As linhas antigas do banco não têm `duracao` no select de todo lugar.
    // Na dúvida, cobrar mensal erra a favor de quem paga.
    expect(recorrenciaDoPlano({ duracao: null })).toEqual({ frequency: 1, frequency_type: 'months' });
    expect(recorrenciaDoPlano({ duracao: undefined })).toEqual({ frequency: 1, frequency_type: 'months' });
  });

  it('a assinatura de verdade também respeita o prazo do plano', () => {
    const corpo = corpoDaAssinatura({
      plano: anual,
      emailDoPagador: 'dono@barbearia.app',
      tenantId: 7,
      backUrl: 'https://barbeariabrutal.vercel.app/assinatura',
      primeiraCobranca: new Date('2026-09-01T12:00:00Z'),
    });
    expect(corpo.auto_recurring.frequency).toBe(12);
    expect(corpo.auto_recurring.transaction_amount).toBe(699);
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

describe('pagamentoRenovaPlano', () => {
  // O furo que isto trava: o webhook chamava `ativarAssinaturaPaga` para
  // QUALQUER pagamento aprovado. Quem pagava R$ 59,90 pelo domínio próprio
  // ganhava um mês de plano de graça — até R$ 159,90 no Premium — e nada na
  // tela indicava isso. A trava existia só no "já paguei — verificar".
  it('mensalidade do plano renova', () => {
    expect(pagamentoRenovaPlano({ metodo: 'pix' })).toBe(true);
  });

  it('adicional de domínio NÃO renova', () => {
    expect(pagamentoRenovaPlano({ metodo: 'pix_dominio' })).toBe(false);
  });

  it('ignora caixa e espaço, que é como o dado chega de integração', () => {
    expect(pagamentoRenovaPlano({ metodo: ' PIX_DOMINIO ' })).toBe(false);
  });

  // Método ausente é o pagamento comum de plano (o schema tem default "pix"):
  // na dúvida, renova — deixar de renovar quem pagou é pior que o contrário.
  it('sem método, trata como pagamento de plano', () => {
    expect(pagamentoRenovaPlano({})).toBe(true);
    expect(pagamentoRenovaPlano({ metodo: null })).toBe(true);
  });
});
