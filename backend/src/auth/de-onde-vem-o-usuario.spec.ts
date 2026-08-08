import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * `@UsuarioLogado()` e `@CurrentUser()` parecem a mesma coisa e não são.
 *
 * `@CurrentUser()` lê `request.user`, que o `JwtAuthGuard` preenche em toda
 * rota autenticada. `@UsuarioLogado()` lê `request.usuario`, que só existe
 * onde o `UsuarioMiddleware` está registrado — hoje, só no controller de
 * agendamento.
 *
 * Usar o segundo fora desse lugar não dá erro de compilação, não quebra
 * teste e não aparece em revisão: o parâmetro simplesmente chega `undefined`,
 * a checagem de permissão recusa todo mundo e a funcionalidade inteira
 * responde 403 — para o dono, inclusive. Foi o que aconteceu com produtos e
 * com atendimento recorrente: as duas telas nasceram inacessíveis.
 *
 * Este teste existe para que a próxima vez seja pega aqui.
 */

const RAIZ = join(__dirname, '..');

function arquivos(pasta: string, achados: string[] = []): string[] {
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) arquivos(caminho, achados);
    else if (item.name.endsWith('.ts') && !item.name.endsWith('.spec.ts')) {
      achados.push(caminho);
    }
  }
  return achados;
}

/** Quem aplica o `UsuarioMiddleware`, e a quais controllers. */
function controllersComMiddleware(): Set<string> {
  const cobertos = new Set<string>();

  for (const arquivo of arquivos(RAIZ)) {
    if (!arquivo.endsWith('.module.ts')) continue;
    const fonte = readFileSync(arquivo, 'utf8');
    if (!fonte.includes('UsuarioMiddleware')) continue;

    for (const achado of fonte.matchAll(/forRoutes\(([^)]*)\)/g)) {
      for (const nome of achado[1].split(',')) {
        const limpo = nome.trim().replace(/['"]/g, '');
        if (limpo) cobertos.add(limpo);
      }
    }
  }

  return cobertos;
}

describe('de onde o controller lê o usuário', () => {
  const cobertos = controllersComMiddleware();

  it('o middleware está registrado em algum lugar — senão este teste é enfeite', () => {
    expect(cobertos.size).toBeGreaterThan(0);
    expect(cobertos).toContain('AgendamentoController');
  });

  it('nenhum controller usa @UsuarioLogado sem o UsuarioMiddleware', () => {
    const quebrados: string[] = [];

    for (const arquivo of arquivos(RAIZ)) {
      if (!arquivo.endsWith('.controller.ts')) continue;

      const fonte = readFileSync(arquivo, 'utf8');
      if (!fonte.includes('@UsuarioLogado')) continue;

      const nomeDaClasse = /export class (\w+)/.exec(fonte)?.[1] ?? '';
      if (!cobertos.has(nomeDaClasse)) {
        quebrados.push(
          `${arquivo.replace(RAIZ, 'src')} (${nomeDaClasse}): use @CurrentUser(), ` +
            'ou registre o UsuarioMiddleware para este controller.',
        );
      }
    }

    expect(quebrados).toEqual([]);
  });

  it('a busca reconhece o caso que quebrou de verdade', () => {
    // Sem isto o teste acima passaria mesmo se parasse de procurar.
    const comoEstava = `
      @Controller('produtos')
      export class ProdutoController {
        listar(@UsuarioLogado() usuario: Usuario) {}
      }
    `;
    expect(comoEstava.includes('@UsuarioLogado')).toBe(true);
    expect(/export class (\w+)/.exec(comoEstava)?.[1]).toBe('ProdutoController');
    expect(cobertos.has('ProdutoController')).toBe(false);
  });
});
