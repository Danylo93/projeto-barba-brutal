/**
 * Só o que dá para testar sem navegador: as funções puras.
 *
 * O `slugDoHost` do middleware monta um caminho a partir do cabeçalho Host,
 * que vem de fora — errar ali deixa entrada externa escolher a rota. Isso
 * merece teste, e não dava para ter um porque o frontend não tinha runner.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
}
