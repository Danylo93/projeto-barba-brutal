import {
  diaSemanaEmBrasilia,
  duracao,
  emMinutos,
  hojeEmBrasilia,
  instanteBrasilia,
  mascaraTelefone,
  montarHorarios,
} from './horarios-publicos'

/** Barbearia aberta de terça a sábado, das 9h às 18h. */
const GRADE = [
  { aberto: false },
  { aberto: false },
  { aberto: true, abre: '09:00', fecha: '18:00' },
  { aberto: true, abre: '09:00', fecha: '18:00' },
  { aberto: true, abre: '09:00', fecha: '18:00' },
  { aberto: true, abre: '09:00', fecha: '18:00' },
  { aberto: true, abre: '09:00', fecha: '18:00' },
]

// 2026-08-15 é um sábado; 2026-08-17, uma segunda (fechada).
const SABADO = '2026-08-15'
const SEGUNDA = '2026-08-17'

describe('o dia da semana sai do fuso de Brasília', () => {
  it('sábado é sábado', () => {
    expect(diaSemanaEmBrasilia(SABADO)).toBe(6)
    expect(diaSemanaEmBrasilia(SEGUNDA)).toBe(1)
  })
})

describe('a hora vai para a API no fuso certo', () => {
  it('15:00 em Brasília é 18:00Z', () => {
    // `new Date('2026-08-15T15:00')` usaria o fuso do NAVEGADOR: um cliente
    // viajando marcaria 15h no fuso dele e apareceria na barbearia em outro
    // horário.
    expect(instanteBrasilia(SABADO, '15:00')).toBe('2026-08-15T18:00:00.000Z')
  })
})

describe('horários oferecidos', () => {
  it('vão de meia em meia hora dentro do expediente', () => {
    const livres = montarHorarios(GRADE, SABADO, 1, [])
    expect(livres[0]).toBe('09:00')
    expect(livres[1]).toBe('09:30')
    expect(livres.at(-1)).toBe('17:30')
  })

  it('dia fechado não oferece nada', () => {
    expect(montarHorarios(GRADE, SEGUNDA, 1, [])).toEqual([])
  })

  it('atendimento longo não é oferecido perto de fechar', () => {
    // Um combo de 1h30 não cabe começando 17h30 numa barbearia que fecha às
    // 18h. Oferecer isso é marcar e depois ligar pedindo desculpa.
    const livres = montarHorarios(GRADE, SABADO, 3, [])
    expect(livres.at(-1)).toBe('16:30')
    expect(livres).not.toContain('17:00')
  })

  it('horário ocupado some da lista', () => {
    const livres = montarHorarios(GRADE, SABADO, 1, ['10:00', '10:30'])
    expect(livres).not.toContain('10:00')
    expect(livres).not.toContain('10:30')
    expect(livres).toContain('11:00')
  })

  it('atendimento de 1h não começa colado num horário ocupado', () => {
    // 10h está livre, mas 10h30 não — e o combo ocupa os dois. Sem esta
    // checagem a tela oferece 10h e a API recusa na confirmação.
    const livres = montarHorarios(GRADE, SABADO, 2, ['10:30'])
    expect(livres).not.toContain('10:00')
    expect(livres).not.toContain('10:30')
    expect(livres).toContain('11:00')
  })

  it('sem dia escolhido, nada é oferecido', () => {
    expect(montarHorarios(GRADE, '', 1, [])).toEqual([])
  })

  it('grade sem horário de abertura não vira 00:00 às 00:00', () => {
    const semHorario = [...GRADE]
    semHorario[6] = { aberto: true }
    expect(montarHorarios(semHorario, SABADO, 1, [])).toEqual([])
  })
})

describe('hoje não oferece horário que já passou', () => {
  const verdadeiroDate = Date

  afterEach(() => {
    global.Date = verdadeiroDate
  })

  it('às 15h de Brasília, a lista começa depois das 15h', () => {
    const hoje = hojeEmBrasilia()
    // Sem congelar o relógio o teste seria diferente a cada hora do dia.
    const agora = new verdadeiroDate(`${hoje}T15:10:00-03:00`)
    global.Date = class extends verdadeiroDate {
      constructor(...args: any[]) {
        // @ts-expect-error — repassa os argumentos do Date original
        super(...(args.length ? args : [agora]))
      }
      static now() {
        return agora.getTime()
      }
    } as any

    const aberta = Array.from({ length: 7 }, () => ({
      aberto: true,
      abre: '09:00',
      fecha: '18:00',
    }))
    const livres = montarHorarios(aberta, hoje, 1, [])

    expect(livres).not.toContain('09:00')
    expect(livres).not.toContain('15:00')
    expect(livres[0]).toBe('15:30')
  })
})

describe('detalhes que a tela mostra', () => {
  it('a duração fala a língua de quem lê', () => {
    expect(duracao(1)).toBe('30 min')
    expect(duracao(2)).toBe('1h')
    expect(duracao(3)).toBe('1h30')
  })

  it('o telefone se formata enquanto a pessoa digita', () => {
    expect(mascaraTelefone('11')).toBe('11')
    expect(mascaraTelefone('1198888')).toBe('(11) 9888-8')
    expect(mascaraTelefone('11988887777')).toBe('(11) 98888-7777')
  })

  it('e não deixa passar do tamanho de um celular', () => {
    expect(mascaraTelefone('119888877779999')).toBe('(11) 98888-7777')
  })

  it('emMinutos entende a hora do expediente', () => {
    expect(emMinutos('09:00')).toBe(540)
    expect(emMinutos('18:30')).toBe(1110)
  })
})
