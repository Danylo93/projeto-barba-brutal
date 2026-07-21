import { validarServicosDoAgendamento } from './agendamento.validacao';

describe('validarServicosDoAgendamento', () => {
  const corte = { id: 1, ehCombo: false };
  const barba = { id: 2, ehCombo: false };
  const combo = { id: 3, ehCombo: true };

  it('rejeita quando nenhum serviço é selecionado', () => {
    expect(validarServicosDoAgendamento([], [])).toMatch(/ao menos um serviço/i);
  });

  it('aceita um único serviço avulso', () => {
    expect(validarServicosDoAgendamento([corte], [])).toBeNull();
  });

  it('aceita vários serviços avulsos juntos', () => {
    expect(validarServicosDoAgendamento([corte, barba], [])).toBeNull();
  });

  it('aceita um combo sozinho', () => {
    expect(validarServicosDoAgendamento([combo], [])).toBeNull();
  });

  it('rejeita combo junto com outro serviço', () => {
    expect(validarServicosDoAgendamento([combo, corte], [])).toMatch(/combo/i);
  });

  it('aceita serviços quando o profissional os realiza', () => {
    expect(validarServicosDoAgendamento([corte, barba], [1, 2, 3])).toBeNull();
  });

  it('rejeita serviço que o profissional não realiza', () => {
    expect(validarServicosDoAgendamento([corte, barba], [1])).toMatch(
      /não realiza/i,
    );
  });

  it('sem vínculo do profissional (lista vazia), aceita qualquer serviço', () => {
    expect(validarServicosDoAgendamento([corte, barba], [])).toBeNull();
  });
});
