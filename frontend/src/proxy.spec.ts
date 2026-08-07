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
