import { calcularJanela, MINUTOS_DE_CARENCIA, telefoneUtilizavel } from './janela';

const AGORA = new Date('2026-08-04T12:00:00Z');
const minutosDe = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60_000);

describe('janela de lembrete', () => {
  // O fluxo antigo olhava de 60 a 65 min à frente. Se uma execução falhasse,
  // aquela fatia sumia para sempre — ninguém lembrado, nenhum erro.
  it('cobre de agora até o horizonte, e não só a fatia final', () => {
    const j = calcularJanela(60, 5, AGORA);
    expect(minutosDe(j.de, AGORA)).toBe(0);
    expect(minutosDe(j.ate, AGORA)).toBe(65);
  });

  it('respeita outros horizontes', () => {
    expect(minutosDe(calcularJanela(120, 10, AGORA).ate, AGORA)).toBe(130);
  });

  // Sem isto, quem agenda para daqui a 40 minutos recebe o "lembrete" um
  // minuto depois de agendar.
  it('dá carência para quem acabou de agendar', () => {
    const j = calcularJanela(60, 5, AGORA);
    expect(minutosDe(j.criadoAte, AGORA)).toBe(-MINUTOS_DE_CARENCIA);
  });

  it('cai no padrão de 60/5 com número inválido', () => {
    const j = calcularJanela(NaN, NaN, AGORA);
    expect(minutosDe(j.ate, AGORA)).toBe(65);
  });

  it('não aceita janela negativa nem zerada', () => {
    const j = calcularJanela(-10, 0, AGORA);
    expect(minutosDe(j.ate, AGORA)).toBe(1);
  });
});

describe('telefone utilizável', () => {
  it('aceita celular com DDD', () => {
    expect(telefoneUtilizavel('11955551234')).toBe(true);
    expect(telefoneUtilizavel('(11) 95555-1234')).toBe(true);
  });

  it('aceita fixo com DDD', () => {
    expect(telefoneUtilizavel('1133334444')).toBe(true);
  });

  it('aceita número já com o 55 na frente', () => {
    expect(telefoneUtilizavel('5511955551234')).toBe(true);
  });

  // Estes entravam na lista e o envio falhava lá na ponta, em silêncio.
  it('recusa o que a Evolution não entrega', () => {
    expect(telefoneUtilizavel('')).toBe(false);
    expect(telefoneUtilizavel(null)).toBe(false);
    expect(telefoneUtilizavel(undefined)).toBe(false);
    expect(telefoneUtilizavel('999999')).toBe(false);
    expect(telefoneUtilizavel('sem numero')).toBe(false);
    expect(telefoneUtilizavel('55119')).toBe(false);
  });
});
