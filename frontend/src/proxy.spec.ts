/**
 * O `slugDoHost` monta um caminho a partir de um cabeçalho que vem de fora.
 * Errar aqui não é só servir a página errada — é deixar entrada externa
 * decidir para onde a requisição vai.
 */
process.env.NEXT_PUBLIC_DOMINIO_RAIZ = 'barbeariabrutal.com'

// `require` depois de definir a env: o módulo lê `NEXT_PUBLIC_DOMINIO_RAIZ`
// no topo, então um `import` estático rodaria antes da linha acima.
/* eslint-disable */
const { slugDoHost } = require('./proxy')
/* eslint-enable */

describe('slug do host', () => {
  it('reconhece a barbearia', () => {
    expect(slugDoHost('latita.barbeariabrutal.com')).toBe('latita')
    expect(slugDoHost('barbearia-do-marcao.barbeariabrutal.com')).toBe(
      'barbearia-do-marcao',
    )
  })

  it('ignora a porta do ambiente local', () => {
    expect(slugDoHost('latita.barbeariabrutal.com:3000')).toBe('latita')
  })

  it('não trata o site principal como barbearia', () => {
    expect(slugDoHost('barbeariabrutal.com')).toBeNull()
    expect(slugDoHost('www.barbeariabrutal.com')).toBeNull()
  })

  it('não trata subdomínio do sistema como barbearia', () => {
    expect(slugDoHost('api.barbeariabrutal.com')).toBeNull()
    expect(slugDoHost('admin.barbeariabrutal.com')).toBeNull()
  })

  // Domínio de outra pessoa terminando parecido não pode passar.
  it('recusa domínio que só imita o nosso', () => {
    expect(slugDoHost('latita.barbeariabrutal.com.evil.io')).toBeNull()
    expect(slugDoHost('naobarbeariabrutal.com')).toBeNull()
    expect(slugDoHost('evilbarbeariabrutal.com')).toBeNull()
  })

  it('recusa mais de um nível', () => {
    expect(slugDoHost('a.b.barbeariabrutal.com')).toBeNull()
  })

  // O prefixo vira caminho: se aceitasse barra ou ponto-ponto, o Host mandaria
  // a requisição para qualquer rota interna.
  it('recusa prefixo que sairia do caminho', () => {
    expect(slugDoHost('../admin.barbeariabrutal.com')).toBeNull()
    expect(slugDoHost('la%2Ftita.barbeariabrutal.com')).toBeNull()
    expect(slugDoHost('-latita.barbeariabrutal.com')).toBeNull()
    expect(slugDoHost('latita-.barbeariabrutal.com')).toBeNull()
  })

  it('aguenta host ausente', () => {
    expect(slugDoHost(null)).toBeNull()
    expect(slugDoHost('')).toBeNull()
  })

  it('não se importa com maiúscula', () => {
    expect(slugDoHost('LaTita.BarbeariaBrutal.com')).toBe('latita')
  })
})

/**
 * O `slugDoHost` já era testado; o `proxy` em si, não. Foi exatamente aí que
 * o defeito morou: a lista de caminhos do sistema ficou desatualizada e
 * ninguém percebeu, porque nenhum teste passava uma requisição por ela.
 *
 * Este bloco lê as pastas de rota DE VERDADE e exige que cada uma sobreviva
 * ao proxy no subdomínio. Rota nova entra no teste sozinha.
 */
describe('o proxy no subdomínio da barbearia', () => {
  const { readdirSync } = require('fs')
  const { join } = require('path')
  /* eslint-disable */
  const { proxy } = require('./proxy')
  /* eslint-enable */

  const INTERNAS = join(__dirname, 'app', '(paginas)', '(internas)')

  function requisicao(caminho: string, host = 'latita.barbeariabrutal.com') {
    return {
      nextUrl: new URL(`https://${host}${caminho}`),
      headers: { get: (nome: string) => (nome.toLowerCase() === 'host' ? host : null) },
    } as any
  }

  /** O destino final da requisição, já com a reescrita aplicada. */
  function destinoDe(caminho: string, host?: string): string {
    const r = proxy(requisicao(caminho, host))
    const reescrito = r?.headers?.get?.('x-middleware-rewrite')
    return reescrito ? new URL(reescrito).pathname : caminho
  }

  const rotasInternas = readdirSync(INTERNAS, { withFileTypes: true })
    .filter((d: any) => d.isDirectory() && !d.name.startsWith('('))
    .map((d: any) => `/${d.name}`)

  it('encontra as rotas internas para conferir', () => {
    // Sem isto, uma varredura vazia faria o `it.each` abaixo passar sem testar
    // nada — que é o tipo de teste verde que não protege ninguém.
    expect(rotasInternas.length).toBeGreaterThan(5)
    expect(rotasInternas).toContain('/produtos')
    expect(rotasInternas).toContain('/recorrentes')
  })

  it.each(rotasInternas)('%s chega ao painel, sem virar página de barbearia', (rota) => {
    expect(destinoDe(rota)).toBe(rota)
  })

  it('a raiz do subdomínio vira a página da barbearia', () => {
    expect(destinoDe('/')).toBe('/barbearia/latita')
  })

  it('e no domínio principal a raiz continua sendo a landing', () => {
    expect(destinoDe('/', 'barbeariabrutal.com')).toBe('/')
  })

  it('caminho fundo do painel também passa', () => {
    expect(destinoDe('/configuracoes/recebimento')).toBe('/configuracoes/recebimento')
  })
})
