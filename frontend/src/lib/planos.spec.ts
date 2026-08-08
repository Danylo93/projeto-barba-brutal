import {
  agruparPlanos,
  chaveDoPlano,
  economiaNoAno,
  ehIlimitado,
  equivalenteMensal,
  mesesDeGraca,
  periodicidadeDe,
  planoEscolhido,
  reais,
} from './planos'

const MENSAL = {
  id: 2,
  nome: 'Profissional',
  descricao: 'Para a barbearia com equipe',
  preco: 69.9,
  duracao: 30,
  maxUsuarios: 999999,
  maxAgendamentos: 999999,
  features: ['Profissionais ilimitados', 'Robô de WhatsApp'],
  periodicidade: 'mensal',
  grupo: 'profissional',
}

const ANUAL = {
  ...MENSAL,
  id: 5,
  nome: 'Profissional Anual',
  preco: 699,
  duracao: 365,
  periodicidade: 'anual',
}

const BASICO = {
  id: 1,
  nome: 'Básico',
  descricao: 'Para quem trabalha sozinho',
  preco: 49.9,
  duracao: 30,
  maxUsuarios: 1,
  maxAgendamentos: 999999,
  features: ['1 profissional'],
  periodicidade: 'mensal',
  grupo: 'basico',
}

describe('agrupar mensal e anual', () => {
  it('vira UM cartão, não dois', () => {
    const cartoes = agruparPlanos([MENSAL, ANUAL])
    expect(cartoes).toHaveLength(1)
    expect(cartoes[0].mensal?.preco).toBe(69.9)
    expect(cartoes[0].anual?.preco).toBe(699)
  })

  it('o cartão usa o nome do mensal', () => {
    // "Premium Anual" no título do cartão faria parecer outro plano.
    const cartoes = agruparPlanos([ANUAL, MENSAL])
    expect(cartoes[0].nome).toBe('Profissional')
  })

  it('ordena do mais barato para o mais caro', () => {
    const cartoes = agruparPlanos([MENSAL, ANUAL, BASICO])
    expect(cartoes.map((c) => c.chave)).toEqual(['basico', 'profissional'])
  })

  it('plano inativo não aparece na vitrine', () => {
    expect(agruparPlanos([{ ...BASICO, ativo: false }])).toHaveLength(0)
  })

  it('aguenta a API devolver só o mensal', () => {
    // É o estado do banco antes de o seed do anual rodar. A landing não pode
    // ficar em branco por causa disso.
    const cartoes = agruparPlanos([MENSAL])
    expect(cartoes[0].anual).toBeUndefined()
    expect(planoEscolhido(cartoes[0], 'anual')?.id).toBe(2)
  })
})

describe('chave e periodicidade', () => {
  it('o grupo manda', () => {
    expect(chaveDoPlano({ grupo: 'premium', nome: 'Premium Anual' })).toBe('premium')
  })

  it('sem grupo, o nome serve — sem a periodicidade grudada', () => {
    expect(chaveDoPlano({ nome: 'Premium Anual', grupo: null })).toBe('premium')
    expect(chaveDoPlano({ nome: 'Básico', grupo: null })).toBe('basico')
  })

  it('a duração decide quando o campo não veio', () => {
    expect(periodicidadeDe({ ...ANUAL, periodicidade: null } as any)).toBe('anual')
    expect(periodicidadeDe({ ...MENSAL, periodicidade: null } as any)).toBe('mensal')
  })
})

describe('a conta que a tela mostra', () => {
  const cartao = agruparPlanos([MENSAL, ANUAL])[0]

  it('o anual sai por menos, por mês', () => {
    // É assim que se compara com o mensal. "R$ 699" ao lado de "R$ 69,90"
    // faz o anual parecer dez vezes mais caro.
    expect(equivalenteMensal(699)).toBe(58.25)
  })

  it('mostra quanto se economiza no ano', () => {
    expect(economiaNoAno(cartao)).toBe(139.8)
  })

  it('e traduz isso em meses grátis', () => {
    expect(mesesDeGraca(cartao)).toBe(2)
  })

  it('sem as duas versões, não promete economia nenhuma', () => {
    const soMensal = agruparPlanos([MENSAL])[0]
    expect(economiaNoAno(soMensal)).toBe(0)
    expect(mesesDeGraca(soMensal)).toBe(0)
  })
})

describe('limites', () => {
  it('999999 é "ilimitado", não novecentos mil', () => {
    expect(ehIlimitado(999999)).toBe(true)
    expect(ehIlimitado(1)).toBe(false)
  })

  it('limite que não veio não vira promessa de ilimitado', () => {
    // Prometer a mais na vitrine só aparece quando o cliente cobra a
    // promessa — e aí já é tarde.
    expect(ehIlimitado(null)).toBe(false)
    expect(ehIlimitado(undefined)).toBe(false)
  })
})

describe('dinheiro na tela', () => {
  it('sai em real, do jeito brasileiro', () => {
    expect(reais(69.9).replace(/ /g, ' ')).toBe('R$ 69,90')
    expect(reais(699).replace(/ /g, ' ')).toBe('R$ 699,00')
  })
})
