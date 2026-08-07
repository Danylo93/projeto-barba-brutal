import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Supressão de Semgrep que não suprime nada.
 *
 * O `// nosemgrep:` lê tudo depois dos dois-pontos como LISTA DE IDS DE REGRA,
 * separados por vírgula. Escrever `// nosemgrep: segredo de teste` parece uma
 * justificativa e não é: o Semgrep procura regras chamadas "segredo", "de" e
 * "teste", não acha nenhuma, e a supressão vira enfeite.
 *
 * Isso aconteceu de verdade neste repositório. O CI de segurança ficou
 * vermelho por dias, com dois achados que qualquer um lendo o código daria
 * como resolvidos — o comentário estava lá, em português, bem escrito. E como
 * o portão vive vermelho, ninguém repara quando fica MAIS vermelho: é assim
 * que uma regressão de verdade passa despercebida.
 *
 * A justificativa em português continua bem-vinda — só numa linha de comentário
 * própria, acima. Depois do `nosemgrep:` só entra id de regra.
 */

const RAIZES = [
  join(__dirname, '..'),
  join(__dirname, '..', '..', '..', 'frontend', 'src'),
];

const EXTENSOES = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

/** Id de regra do Semgrep: caminho pontilhado, sem espaço. */
const PARECE_ID_DE_REGRA = /^[A-Za-z0-9_.-]+$/;

function arquivosDe(pasta: string, achados: string[] = []): string[] {
  let itens;
  try {
    itens = readdirSync(pasta, { withFileTypes: true });
  } catch {
    return achados; // pasta que não existe neste checkout não é falha de teste
  }

  for (const item of itens) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) {
      if (['node_modules', '.next', 'dist', 'coverage'].includes(item.name)) continue;
      arquivosDe(caminho, achados);
    } else if (EXTENSOES.some((ext) => item.name.endsWith(ext))) {
      achados.push(caminho);
    }
  }
  return achados;
}

/** Cada `nosemgrep:` do código, com o que veio depois dos dois-pontos. */
function supressoes(): { arquivo: string; linha: number; ids: string[] }[] {
  const encontradas: { arquivo: string; linha: number; ids: string[] }[] = [];

  for (const raiz of RAIZES) {
    for (const arquivo of arquivosDe(raiz)) {
      const linhas = readFileSync(arquivo, 'utf8').split('\n');
      linhas.forEach((texto, indice) => {
        // Este próprio arquivo fala de `nosemgrep:` o tempo todo, em prosa.
        if (arquivo === __filename) return;

        const marca = texto.match(/nosemgrep:(.*)$/);
        if (!marca) return;

        const ids = marca[1]
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        encontradas.push({ arquivo, linha: indice + 1, ids });
      });
    }
  }
  return encontradas;
}

describe('supressão de Semgrep', () => {
  it('depois de "nosemgrep:" só entra id de regra, nunca justificativa', () => {
    const escritasErradas = supressoes()
      .filter(({ ids }) => ids.length === 0 || ids.some((id) => !PARECE_ID_DE_REGRA.test(id)))
      .map(({ arquivo, linha, ids }) => `${arquivo}:${linha} → "${ids.join(', ')}"`);

    if (escritasErradas.length) {
      throw new Error(
        'Supressão de Semgrep que não suprime nada — o texto depois de ' +
          '"nosemgrep:" é lido como lista de ids de regra:\n' +
          escritasErradas.join('\n') +
          '\n\nUse o id que o Semgrep imprime no achado e ponha o porquê num ' +
          'comentário separado, acima.',
      );
    }
  });

  // Sem isto o teste acima é enfeite: precisa ser capaz de falhar.
  it('a checagem realmente pega uma justificativa em prosa', () => {
    const emProsa = 'segredo de teste'
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    expect(emProsa.some((id) => !PARECE_ID_DE_REGRA.test(id))).toBe(true);

    const idDeVerdade = ['javascript.jsonwebtoken.security.jwt-hardcode.hardcoded-jwt-secret'];
    expect(idDeVerdade.every((id) => PARECE_ID_DE_REGRA.test(id))).toBe(true);
  });

  it('encontra as supressões que existem hoje', () => {
    // Se este número cair para zero, a varredura quebrou e o guarda acima
    // passaria a dar verde sem olhar nada.
    expect(supressoes().length).toBeGreaterThan(0);
  });
});
