import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { DIAS_TESTE_GRATIS, PRAZO_TESTE_GRATIS } from './teste-gratis';

/**
 * O prazo do teste é uma promessa, e promessa quebrada aqui o cliente
 * descobre pela fatura: a landing anuncia um prazo e a cobrança do Mercado
 * Pago cai em outro dia.
 *
 * Isso quase aconteceu porque o número estava digitado à mão em dez lugares
 * da landing e em mais alguns do backend. Estes testes existem para que
 * mudar o prazo continue sendo mexer em UM lugar de cada lado — e para que os
 * dois lados nunca divirjam em silêncio.
 */

const RAIZ_FRONT = join(__dirname, '..');
const CONSTANTE_DO_BACKEND = join(
  __dirname, '..', '..', '..', 'backend', 'src', 'assinatura', 'teste-gratis.ts',
);

/** Telas onde "30 dias" fala de outra coisa: aviso, retenção, uptime. */
const NADA_A_VER_COM_O_TESTE = [
  'terms/page.tsx',
  'privacy/page.tsx',
  'status/page.tsx',
  'clube/page.tsx',
];

function arquivosDeCodigo(pasta: string, achados: string[] = []): string[] {
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) arquivosDeCodigo(caminho, achados);
    else if (/\.(ts|tsx)$/.test(item.name) && !item.name.endsWith('.spec.ts')) {
      achados.push(caminho);
    }
  }
  return achados;
}

describe('prazo do teste grátis', () => {
  it('o texto sai do número, e não o contrário', () => {
    expect(PRAZO_TESTE_GRATIS).toBe(`${DIAS_TESTE_GRATIS} dias`);
  });

  it('é o MESMO número que o backend usa para calcular a data de fim', () => {
    // O backend é quem manda: ele grava o `dataFim` da assinatura e monta o
    // `free_trial` do Mercado Pago. Aqui é só o que se anuncia. Divergir
    // significa anunciar um prazo e cobrar em outro.
    const fonte = readFileSync(CONSTANTE_DO_BACKEND, 'utf8');
    const achado = fonte.match(/export const DIAS_TESTE_GRATIS = (\d+)/);
    expect(achado).not.toBeNull();
    expect(Number(achado![1])).toBe(DIAS_TESTE_GRATIS);
  });

  it('nenhuma tela escreve o prazo do teste à mão', () => {
    const suspeitos: string[] = [];

    for (const arquivo of arquivosDeCodigo(RAIZ_FRONT)) {
      if (NADA_A_VER_COM_O_TESTE.some((t) => arquivo.replace(/\\/g, '/').includes(t))) continue;

      const conteudo = readFileSync(arquivo, 'utf8');
      for (const linha of conteudo.split('\n')) {
        // Só interessa "N dias" perto de palavra de teste/grátis: é aí que o
        // número vira promessa. "30 dias" num comentário de outra coisa não.
        if (!/\d+\s*dias/i.test(linha)) continue;
        if (!/gr[áa]tis|teste|trial|premium/i.test(linha)) continue;
        suspeitos.push(`${arquivo.replace(RAIZ_FRONT, 'src')}: ${linha.trim()}`);
      }
    }

    expect(suspeitos).toEqual([]);
  });

  it('a busca por prazo escrito à mão realmente pega o caso antigo', () => {
    // Sem isto o teste acima é enfeite: ele precisa ser capaz de falhar.
    const comoEstava = 'Todos os planos incluem 30 dias de teste com acesso Premium';
    expect(/\d+\s*dias/i.test(comoEstava) && /gr[áa]tis|teste|premium/i.test(comoEstava)).toBe(true);

    const comoFicou = 'Todos os planos incluem {PRAZO_TESTE_GRATIS} de teste com acesso Premium';
    expect(/\d+\s*dias/i.test(comoFicou)).toBe(false);
  });
});
