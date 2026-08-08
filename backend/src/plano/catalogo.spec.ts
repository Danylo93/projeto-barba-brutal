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

  it('cada plano tem um teto de equipe diferente', () => {
    // O eixo da escada é a cadeira, como no resto do mercado. Antes daqui o
    // Profissional e o Premium tinham o MESMO teto — os dois ilimitados — e
    // sobrava só "sinal" e "suporte" para justificar R$ 30 de diferença. Sem
    // degrau de capacidade, o plano de cima não tem por que existir.
    const porGrupo = Object.fromEntries(linhas.map((l) => [l.grupo, l.maxUsuarios]));
    expect(porGrupo.basico).toBe(1);
    expect(porGrupo.profissional).toBe(5);
    expect(porGrupo.premium).toBe(SEM_LIMITE);

    const tetos = [porGrupo.basico, porGrupo.profissional, porGrupo.premium];
    expect(new Set(tetos).size).toBe(3);
    expect(tetos).toEqual([...tetos].sort((a, b) => a - b));
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
});

/**
 * Estes testes montam o plano a partir do CATÁLOGO, com as features de
 * verdade. Os de cima passam `features: []`, e foi por isso que a regressão
 * passou batido: o Básico ganhou "Lembrete automático no WhatsApp" e a regra
 * do robô, que só procurava "whatsapp", liberou o robô inteiro no plano de
 * R$ 49,90 — em produção, não em teoria.
 */
describe('o robô, com as features que o plano realmente tem', () => {
  const doCatalogo = (grupo: string, sufixo = '') => {
    const plano = CATALOGO.find((p) => p.grupo === grupo)!;
    return { nome: `${plano.nome}${sufixo}`, grupo: plano.grupo, features: plano.features };
  };

  it.each(['', ' Anual'])('o Básico%s não tem robô', (sufixo) => {
    expect(planoTemRobo(doCatalogo('basico', sufixo))).toBe(false);
  });

  it.each(['profissional', 'premium'])('o %s tem', (grupo) => {
    expect(planoTemRobo(doCatalogo(grupo))).toBe(true);
  });

  it('a linha antiga, sem grupo, ainda decide pelo nome', () => {
    // Barbearia cadastrada antes do `grupo` existir. Se isto quebrar, ela
    // acorda sem robô sem ninguém ter mexido no plano dela.
    const { nome, features } = doCatalogo('profissional');
    expect(planoTemRobo({ nome, grupo: null, features })).toBe(true);
    expect(planoTemRobo({ nome: 'Básico', grupo: null, features: doCatalogo('basico').features })).toBe(false);
  });

  it('com grupo, nem o nome nem o texto da feature decidem', () => {
    // O guard do robô lê o plano do banco e, até agora, trazia só `nome` e
    // `features` — a chave canônica nunca era consultada em produção. Enquanto
    // as duas coisas estivessem intactas dava no mesmo, e é por isso que o
    // buraco ficou escondido: o nome sozinho salva, a feature sozinha salva.
    //
    // Mexer nas DUAS ao mesmo tempo é o que derruba. Renomear o plano numa
    // promoção e reescrever a lista de features é exatamente o tipo de coisa
    // que o dono do SaaS faz por uma tela de admin, sem imaginar que está
    // desligando o robô de quem paga.
    const renomeado = { nome: 'Plano Equipe 2026', features: ['Profissionais ilimitados'] };
    expect(planoTemRobo({ ...renomeado, grupo: null })).toBe(false);
    expect(planoTemRobo({ ...renomeado, grupo: 'profissional' })).toBe(true);
  });

  it('o plano sob medida libera escrevendo robô e WhatsApp na mesma linha', () => {
    expect(planoTemRobo({ nome: 'Sob medida', features: ['Robô de WhatsApp'] })).toBe(true);
    expect(planoTemRobo({ nome: 'Sob medida', features: ['Robo de whatsapp'] })).toBe(true);
    expect(planoTemRobo({ nome: 'Sob medida', features: ['Lembrete no WhatsApp'] })).toBe(false);
  });

  it('o nome montado é o que a regra tem que aguentar', () => {
    expect(nomeDoPlano('Profissional', 'anual')).toBe('Profissional Anual');
    expect(nomeDoPlano('Profissional', 'mensal')).toBe('Profissional');
  });
});
