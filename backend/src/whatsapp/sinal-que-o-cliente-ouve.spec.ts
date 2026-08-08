import { sinalParaOCliente } from './conversa';

/**
 * O robô só sabe do sinal o que a API mastigar para ele.
 *
 * Se ele responder "marcado!" sem falar do Pix, o horário morre sozinho no
 * fim do prazo: a barbearia perde a vaga e o cliente aparece para um
 * agendamento que não existe mais. E se ele falar a hora lendo o campo cru,
 * erra por três horas — foi exatamente o que já aconteceu com o campo `data`.
 */

/** 15:00 em Brasília. Gravado como 18:00Z, que é a pegadinha. */
const QUINZE_EM_BRASILIA = new Date('2026-08-15T18:00:00Z');

function pendente(extra: Record<string, unknown> = {}) {
  return {
    sinalStatus: 'pendente',
    sinalValor: 20,
    sinalExpiraEm: QUINZE_EM_BRASILIA,
    sinalPixCopiaECola: '00020126...6304ABCD',
    ...extra,
  };
}

describe('o sinal que o robô recebe pronto', () => {
  it('vem com valor, prazo escrito e o Pix', () => {
    const sinal = sinalParaOCliente(pendente(), new Date('2026-08-15T17:30:00Z'));
    expect(sinal).toEqual({
      valor: 20,
      ateQuando: '15/08 às 15:00',
      minutos: 30,
      pixCopiaECola: '00020126...6304ABCD',
    });
  });

  it('a hora sai no fuso de Brasília, não no do banco', () => {
    // Se este teste passar a dizer 18:00, o cliente vai ouvir que tem até as
    // 18h para pagar um Pix que vence às 15h.
    expect(sinalParaOCliente(pendente())!.ateQuando).toBe('15/08 às 15:00');
    expect(sinalParaOCliente(pendente())!.ateQuando).not.toContain('18:00');
  });

  it('arredonda os minutos para cima', () => {
    // Faltando 89 segundos, dizer "1 minuto" faz o cliente achar que dá tempo.
    const quase = new Date(QUINZE_EM_BRASILIA.getTime() - 89_000);
    expect(sinalParaOCliente(pendente(), quase)!.minutos).toBe(2);
  });

  it('prazo vencido não vira minuto negativo', () => {
    const depois = new Date(QUINZE_EM_BRASILIA.getTime() + 10 * 60_000);
    expect(sinalParaOCliente(pendente(), depois)!.minutos).toBe(0);
  });
});

describe('quando não há sinal a pagar, o robô não recebe nada', () => {
  it.each(['nao_exigido', 'pago', 'dispensado', 'expirado'])(
    'status %s devolve null',
    (sinalStatus) => {
      expect(sinalParaOCliente(pendente({ sinalStatus }))).toBeNull();
    },
  );

  it('agendamento antigo, com tudo nulo, devolve null', () => {
    // Toda linha criada antes do sinal existir. Se isto virasse um objeto, o
    // robô passaria a falar de Pix em barbearia que não cobra sinal.
    expect(
      sinalParaOCliente({
        sinalStatus: null,
        sinalValor: null,
        sinalExpiraEm: null,
        sinalPixCopiaECola: null,
      }),
    ).toBeNull();
  });

  it('pendente sem valor ou sem prazo também não vira mensagem', () => {
    expect(sinalParaOCliente(pendente({ sinalValor: 0 }))).toBeNull();
    expect(sinalParaOCliente(pendente({ sinalValor: null }))).toBeNull();
    expect(sinalParaOCliente(pendente({ sinalExpiraEm: null }))).toBeNull();
  });

  it('null não quebra', () => {
    expect(sinalParaOCliente(null)).toBeNull();
  });
});

describe('o Pix pode faltar sem derrubar o resto', () => {
  it('sem copia e cola, o prazo ainda é dito', () => {
    // Melhor avisar "tem 30 minutos para pagar" e a pessoa perguntar a chave
    // do que calar e ela perder o horário.
    const sinal = sinalParaOCliente(pendente({ sinalPixCopiaECola: null }));
    expect(sinal).not.toBeNull();
    expect(sinal!.pixCopiaECola).toBeNull();
    expect(sinal!.valor).toBe(20);
  });
});
