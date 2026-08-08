import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { CATALOGO } from './catalogo';

/**
 * O `FeatureGuard` decide se a rota abre procurando a palavra do
 * `@RequiresFeature` DENTRO das features do plano — que são texto de vitrine,
 * escrito para o dono da barbearia ler na página de preços.
 *
 * Isso amarra permissão a redação, e foi exatamente assim que quebrou: o
 * Premium teve as features reescritas para "Tudo do Profissional", nenhuma
 * linha passou a conter "agendamentos", e o plano MAIS CARO começou a receber
 * 403 em toda rota de agendamento. Como o teste grátis entrega o Premium a
 * todo mundo, barbearia nova nascia sem conseguir marcar nada — e o sintoma
 * chegou como "o agendamento não aparece", não como "erro de permissão".
 *
 * Este teste varre os controladores de verdade, junta cada `@RequiresFeature`
 * e exige que TODO plano do catálogo satisfaça todos. Enquanto o guard for por
 * substring, é o que impede a próxima reescrita de texto de derrubar a agenda.
 */

const SRC = join(__dirname, '..');

function arquivosDeControlador(pasta: string, achados: string[] = []): string[] {
  for (const item of readdirSync(pasta)) {
    const caminho = join(pasta, item);
    if (statSync(caminho).isDirectory()) {
      arquivosDeControlador(caminho, achados);
    } else if (item.endsWith('.controller.ts')) {
      achados.push(caminho);
    }
  }
  return achados;
}

/** Toda feature exigida por decorador, com o arquivo que a exige. */
function featuresExigidas(): Array<{ feature: string; arquivo: string }> {
  const exigencias: Array<{ feature: string; arquivo: string }> = [];
  for (const arquivo of arquivosDeControlador(SRC)) {
    const conteudo = readFileSync(arquivo, 'utf8');
    // @RequiresFeature('a', 'b') — pega cada string de dentro.
    for (const chamada of conteudo.matchAll(/@RequiresFeature\(([^)]*)\)/g)) {
      for (const literal of chamada[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
        exigencias.push({ feature: literal[1], arquivo: arquivo.replace(SRC, 'src') });
      }
    }
  }
  return exigencias;
}

/** A mesma comparação que o FeatureGuard faz, sem inventar nada. */
function planoAtende(features: string[], exigida: string): boolean {
  return features.some((f) => f.toLowerCase().includes(exigida.toLowerCase()));
}

const exigencias = featuresExigidas();

describe('o portão de features', () => {
  it('encontra pelo menos uma rota protegida', () => {
    // Se a varredura parar de achar nada, os testes abaixo passam vazios e o
    // arquivo inteiro vira decoração.
    expect(exigencias.length).toBeGreaterThan(0);
  });

  const casos = CATALOGO.flatMap((plano) =>
    exigencias.map((e) => [plano.nome, e.feature, e.arquivo, plano.features] as const),
  );

  it.each(casos)('o plano %s abre a rota que exige "%s" (%s)', (_nome, feature, _arquivo, features) => {
    expect(planoAtende([...features], feature)).toBe(true);
  });
});

describe('o plano mais caro nunca entrega menos que o mais barato', () => {
  it('tudo que o Básico abre, o Premium também abre', () => {
    // "Tudo do Profissional" como única linha era literalmente verdade na
    // vitrine e mentira no código. Esta é a checagem que não depende de
    // ninguém lembrar de conferir rota por rota.
    const basico = CATALOGO.find((p) => p.grupo === 'basico')!;
    const premium = CATALOGO.find((p) => p.grupo === 'premium')!;

    for (const { feature } of exigencias) {
      if (!planoAtende([...basico.features], feature)) continue;
      expect(planoAtende([...premium.features], feature)).toBe(true);
    }
  });

  it('e o Premium também abre tudo do Profissional', () => {
    const profissional = CATALOGO.find((p) => p.grupo === 'profissional')!;
    const premium = CATALOGO.find((p) => p.grupo === 'premium')!;

    for (const { feature } of exigencias) {
      if (!planoAtende([...profissional.features], feature)) continue;
      expect(planoAtende([...premium.features], feature)).toBe(true);
    }
  });
});
