import {
  CATALOGO,
  chaveDoPlano,
  duracaoEmDias,
  economiaAnual,
  linhasDoCatalogo,
  MESES_COBRADOS_NO_ANUAL,
  nomeDoPlano,
  precoAnual,
  SEM_LIMITE,
} from './catalogo';
import { planoTemRobo } from '../whatsapp/conversa';

describe('preço do plano anual', () => {
  it('sai mais barato que pagar doze meses', () => {
    for (const plano of CATALOGO) {
      expect(precoAnual(plano.precoMensal)).toBeLessThan(plano.precoMensal * 12);
    }
  });

  it('a economia é exatamente os meses que não se cobra', () => {
    // A landing promete "2 meses grátis". Se a conta aqui mudar e o texto
    // não, a promessa vira mentira na fatura.
    const mesesDeGraca = 12 - MESES_COBRADOS_NO_ANUAL;
    expect(economiaAnual(100)).toBe(100 * mesesDeGraca);
  });

  it('não sobra centavo perdido no arredondamento', () => {
    expect(precoAnual(69.9)).toBe(699);
    expect(precoAnual(99.9)).toBe(999);
  });
});

describe('linhas do catálogo', () => {
  const linhas = linhasDoCatalogo();

  it('cria os três planos nas duas periodicidades', () => {
    expect(linhas).toHaveLength(CATALOGO.length * 2);
    expect(linhas.map((l) => l.nome)).toContain('Premium Anual');
    expect(linhas.map((l) => l.nome)).toContain('Premium');
  });

  it('o anual vale um ano e o mensal, um mês', () => {
    expect(duracaoEmDias('anual')).toBe(365);
    expect(duracaoEmDias('mensal')).toBe(30);
    for (const linha of linhas) {
      expect(linha.duracao).toBe(duracaoEmDias(linha.periodicidade));
    }
  });

  it('quem paga o ano recebe EXATAMENTE o mesmo que o mensal', () => {
    // O risco real de plano anual é ele nascer como um plano à parte e ir
    // ficando para trás: acrescenta-se uma feature no mensal e ninguém lembra
    // do anual. Aí quem pagou adiantado tem menos.
    for (const plano of CATALOGO) {
      const mensal = linhas.find((l) => l.grupo === plano.grupo && l.periodicidade === 'mensal')!;
      const anual = linhas.find((l) => l.grupo === plano.grupo && l.periodicidade === 'anual')!;

      expect(anual.features).toEqual(mensal.features);
      expect(anual.maxUsuarios).toBe(mensal.maxUsuarios);
      expect(anual.maxAgendamentos).toBe(mensal.maxAgendamentos);
    }
  });

  it('nenhum plano tem teto de agendamento', () => {
    // O teto de 200/mês recusava agendamento com 403 no meio do mês bom.
    for (const linha of linhas) {
      expect(linha.maxAgendamentos).toBe(SEM_LIMITE);
    }
  });

  it('só o Básico limita a equipe', () => {
    const porGrupo = Object.fromEntries(linhas.map((l) => [l.grupo, l.maxUsuarios]));
    expect(porGrupo.basico).toBe(1);
    expect(porGrupo.profissional).toBe(SEM_LIMITE);
    expect(porGrupo.premium).toBe(SEM_LIMITE);
  });
});

describe('chaveDoPlano', () => {
  it('o anual e o mensal do mesmo plano têm a mesma chave', () => {
    expect(chaveDoPlano({ grupo: 'premium', nome: 'Premium Anual' })).toBe('premium');
    expect(chaveDoPlano({ grupo: 'premium', nome: 'Premium' })).toBe('premium');
  });

  it('sem grupo, cai no nome — e ainda assim ignora a periodicidade', () => {
    // As linhas que já existiam em produção não têm grupo até a migração
    // rodar. Elas não podem perder acesso nesse intervalo.
    expect(chaveDoPlano({ nome: 'Profissional' })).toBe('profissional');
    expect(chaveDoPlano({ nome: 'Profissional Anual' })).toBe('profissional');
    expect(chaveDoPlano({ nome: 'Básico' })).toBe('basico');
  });

  it('não explode com plano nenhum', () => {
    expect(chaveDoPlano(null)).toBe('');
    expect(chaveDoPlano({})).toBe('');
  });
});

describe('o plano anual não pode entregar menos que o mensal', () => {
  it('o robô continua ligado em quem pagou o ano do Profissional', () => {
    // Este é o bug que o `grupo` existe para impedir: a regra do robô lia o
    // nome do plano, e "Profissional Anual" não é "profissional". A barbearia
    // pagaria dez meses adiantado para ficar sem robô.
    expect(planoTemRobo({ nome: 'Profissional Anual', grupo: 'profissional', features: [] })).toBe(true);
    expect(planoTemRobo({ nome: 'Premium Anual', grupo: 'premium', features: [] })).toBe(true);
  });

  it('e continua desligado no Básico, mensal ou anual', () => {
    expect(planoTemRobo({ nome: 'Básico', grupo: 'basico', features: [] })).toBe(false);
    expect(planoTemRobo({ nome: 'Básico Anual', grupo: 'basico', features: [] })).toBe(false);
  });

  it('o nome montado é o que a regra tem que aguentar', () => {
    expect(nomeDoPlano('Profissional', 'anual')).toBe('Profissional Anual');
    expect(nomeDoPlano('Profissional', 'mensal')).toBe('Profissional');
  });
});
