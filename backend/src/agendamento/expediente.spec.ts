import {
  diaEHoraEmBrasilia,
  expedienteDoDia,
  validarDentroDoExpediente,
} from './agendamento.validacao';

/** 2026-08-02 é um domingo. Datas em UTC, convertidas para Brasília (UTC−3). */
const domingo14hBrasilia = new Date('2026-08-02T17:00:00.000Z');
const domingo4hBrasilia = new Date('2026-08-02T07:00:00.000Z');
const segunda10hBrasilia = new Date('2026-08-03T13:00:00.000Z');
const segunda20hBrasilia = new Date('2026-08-03T23:00:00.000Z');

describe('diaEHoraEmBrasilia', () => {
  it('converte de UTC para o fuso de Brasília', () => {
    // 17:00 UTC = 14:00 em Brasília, domingo.
    expect(diaEHoraEmBrasilia(domingo14hBrasilia)).toEqual({ dia: 0, hora: 14 });
    expect(diaEHoraEmBrasilia(segunda10hBrasilia)).toEqual({ dia: 1, hora: 10 });
  });

  it('não deixa a virada de dia enganar', () => {
    // 02:00 UTC de segunda ainda é domingo, 23:00, em Brasília.
    const d = diaEHoraEmBrasilia(new Date('2026-08-03T02:00:00.000Z'));
    expect(d.dia).toBe(0);
    expect(d.hora).toBe(23);
  });

  it('lê os minutos como fração da hora', () => {
    expect(diaEHoraEmBrasilia(new Date('2026-08-03T13:30:00.000Z')).hora).toBe(10.5);
  });
});

describe('expedienteDoDia', () => {
  const formatoNovo = {
    horarios: [
      { dia: 0, aberto: false },
      { dia: 1, aberto: true, abertura: 9, fechamento: 19 },
      { dia: 6, aberto: true, abertura: 9, fechamento: 14 },
    ],
  };

  it('lê o formato por dia', () => {
    expect(expedienteDoDia(formatoNovo, 1)).toEqual({
      aberto: true,
      abertura: 9,
      fechamento: 19,
    });
    expect(expedienteDoDia(formatoNovo, 0)?.aberto).toBe(false);
    expect(expedienteDoDia(formatoNovo, 6)?.fechamento).toBe(14);
  });

  it('dia ausente da lista conta como fechado', () => {
    expect(expedienteDoDia(formatoNovo, 3)?.aberto).toBe(false);
  });

  it('lê o formato antigo, com um horário para todos os dias', () => {
    const antigo = { diasAbertos: [1, 2, 3], horaAbertura: 8, horaFechamento: 20 };
    expect(expedienteDoDia(antigo, 2)).toEqual({
      aberto: true,
      abertura: 8,
      fechamento: 20,
    });
    expect(expedienteDoDia(antigo, 0)?.aberto).toBe(false);
  });

  it('devolve null quando não há configuração', () => {
    // Barbearia que ainda não configurou nada não pode ser travada.
    expect(expedienteDoDia(null, 1)).toBeNull();
    expect(expedienteDoDia({}, 1)).toBeNull();
    expect(expedienteDoDia({ horaAbertura: 'oito' }, 1)).toBeNull();
  });
});

describe('validarDentroDoExpediente', () => {
  const config = {
    horarios: [
      { dia: 0, aberto: false },
      { dia: 1, aberto: true, abertura: 9, fechamento: 19 },
    ],
  };

  it('aceita horário dentro do expediente', () => {
    expect(validarDentroDoExpediente(segunda10hBrasilia, 30, config)).toBeNull();
  });

  it('recusa dia fechado, dizendo qual', () => {
    const erro = validarDentroDoExpediente(domingo14hBrasilia, 30, config);
    expect(erro).toContain('domingo');
  });

  it('recusa madrugada de domingo — o caso que passou em produção', () => {
    expect(validarDentroDoExpediente(domingo4hBrasilia, 30, config)).not.toBeNull();
  });

  it('recusa depois do fechamento', () => {
    const erro = validarDentroDoExpediente(segunda20hBrasilia, 30, config);
    expect(erro).toContain('09h');
    expect(erro).toContain('19h');
  });

  it('recusa quando o atendimento COMEÇA dentro mas TERMINA depois de fechar', () => {
    // 18:30 + 60 min = 19:30, passa das 19h.
    const dezoitoETrinta = new Date('2026-08-03T21:30:00.000Z');
    expect(validarDentroDoExpediente(dezoitoETrinta, 60, config)).not.toBeNull();
    // O mesmo horário com 30 min cabe justo.
    expect(validarDentroDoExpediente(dezoitoETrinta, 30, config)).toBeNull();
  });

  it('não trava barbearia sem configuração', () => {
    expect(validarDentroDoExpediente(domingo4hBrasilia, 30, null)).toBeNull();
    expect(validarDentroDoExpediente(domingo4hBrasilia, 30, {})).toBeNull();
  });
});
