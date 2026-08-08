import { readFileSync } from 'fs';
import { join } from 'path';
import { CATALOGO, MESES_COBRADOS_NO_ANUAL, precoAnual, SEM_LIMITE } from './catalogo';

/**
 * O Barry e a Cacau falam preço por WhatsApp. Quando o catálogo muda e o
 * prompt não, o robô passa a vender por um valor que o site não cobra — e a
 * pessoa desiste antes de abrir o link, sem ninguém ficar sabendo.
 *
 * Foi o que aconteceu: o prompt anunciava Profissional a R$ 99,90 e Premium a
 * R$ 159,90 semanas depois de eles virarem R$ 69,90 e R$ 99,90. Este teste é
 * o alarme que faltava — mexeu no catálogo, o prompt cai junto.
 *
 * Ele confere número, não redação. Como o texto é escrito para gente ler, o
 * preço aparece como "R$ 69,90", com vírgula.
 */

const PROMPTS = join(__dirname, '..', '..', '..', 'n8n', 'prompts');

/**
 * Só o que está dentro da cerca ``` — é esse pedaço que vai colado no nó do
 * agente. O texto em volta é para humano e cita de propósito o preço antigo,
 * ao explicar o que mudou; conferir o arquivo inteiro reprovaria o changelog.
 */
function lerOPrompt(arquivo: string): string {
  const arquivoInteiro = readFileSync(join(PROMPTS, arquivo), 'utf8');
  const cercado = arquivoInteiro.match(/^```\n([\s\S]*?)^```/m);
  if (!cercado) throw new Error(`${arquivo} não tem o bloco do prompt entre \`\`\``);
  return cercado[1];
}

const barry = lerOPrompt('barry-vendas.md');
const cacau = lerOPrompt('cacau-suporte.md');

/**
 * O mesmo texto com as quebras de linha achatadas.
 *
 * Uma frase que atravessa duas linhas do arquivo é a mesma frase; sem isto o
 * teste reprovaria só porque alguém reformatou o parágrafo, e teste que
 * reclama de coisa certa é teste que se aprende a ignorar.
 */
const barryCorrido = barry.replace(/\s+/g, ' ');
const cacauCorrido = cacau.replace(/\s+/g, ' ');

/** 69.9 → "69,90", que é como o texto escreve. */
function comoOTextoEscreve(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

describe('o prompt do Barry cobra o preço do catálogo', () => {
  it.each(CATALOGO.map((p) => [p.nome, p.precoMensal] as const))(
    'o mensal do %s aparece como R$ %s',
    (_nome, preco) => {
      expect(barry).toContain(`R$ ${comoOTextoEscreve(preco)}`);
    },
  );

  it.each(CATALOGO.map((p) => [p.nome, precoAnual(p.precoMensal)] as const))(
    'o anual do %s aparece',
    (_nome, preco) => {
      // O anual é redondo (R$ 499), então o texto escreve sem centavos.
      expect(barry).toMatch(new RegExp(`R\\$ ${Math.round(preco)}\\b`));
    },
  );

  it('diz quantos meses se paga no anual', () => {
    expect(barryCorrido).toContain(`paga ${MESES_COBRADOS_NO_ANUAL} meses`);
  });

  it('não carrega preço que saiu do catálogo', () => {
    // Os dois preços antigos, um a um. Se algum voltar ao texto, é porque
    // alguém copiou de uma versão velha do prompt.
    const aposentados = ['R$ 99,90', 'R$ 159,90'];
    const vivos = CATALOGO.map((p) => `R$ ${comoOTextoEscreve(p.precoMensal)}`);
    for (const antigo of aposentados) {
      if (vivos.includes(antigo)) continue;
      expect(barry).not.toContain(antigo);
      expect(cacau).not.toContain(antigo);
    }
  });
});

describe('os dois prompts contam a mesma história de limite', () => {
  it('nenhum promete teto de barbeiros onde o catálogo diz ilimitado', () => {
    // "até 5 barbeiros" foi o texto que sobreviveu ao teto ser removido, e a
    // Cacau mandava cliente pagante fazer upgrade que ele não precisava.
    for (const texto of [barry, cacau]) {
      expect(texto).not.toMatch(/at[ée] \d+ (barbeiros|profissionais)/i);
    }
  });

  it('o Básico continua sendo o único com um profissional só', () => {
    const basico = CATALOGO.find((p) => p.grupo === 'basico')!;
    expect(basico.maxUsuarios).toBe(1);
    expect(cacauCorrido).toMatch(/B[áa]sico permite 1/i);

    const ilimitados = CATALOGO.filter((p) => p.maxUsuarios === SEM_LIMITE).map((p) => p.nome);
    expect(ilimitados).toEqual(['Profissional', 'Premium']);
    expect(cacauCorrido).toMatch(/Profissional e Premium s[ãa]o ilimitados/i);
  });

  it('agendamento é ilimitado em todos, e os dois dizem isso', () => {
    expect(CATALOGO.every((p) => p.maxAgendamentos === SEM_LIMITE)).toBe(true);
    expect(barryCorrido).toMatch(/Agendamentos s[ãa]o ilimitados em todos/i);
    expect(cacauCorrido).toMatch(/ilimitados, em qualquer plano/i);
  });
});

describe('o robô é vendido só onde ele existe', () => {
  it('o Barry diz Profissional e Premium, e nega o Básico', () => {
    expect(barryCorrido).toContain('Está no Profissional e no Premium.');
    expect(barryCorrido).toMatch(/N[ãa]o diz que o rob[ôo] est[áa] no B[áa]sico/i);
  });

  it('a Cacau separa lembrete de robô', () => {
    // Lembrete é de todo plano; robô não. Confundir os dois faz o suporte
    // dizer "seu plano não tem" para uma coisa que o plano tem.
    const basico = CATALOGO.find((p) => p.grupo === 'basico')!;
    expect(basico.features.some((f) => /lembrete/i.test(f))).toBe(true);
    expect(basico.features.some((f) => /rob[ôo]/i.test(f))).toBe(false);
    expect(cacauCorrido).toMatch(/lembrete autom[áa]tico est[áa] em todos os planos/i);
  });
});

describe('nem tudo que está no catálogo existe de verdade', () => {
  it('nenhum dos dois promete cupom', () => {
    // O catálogo anuncia "Cupons de desconto" no Premium, mas não há endpoint
    // nem tabela: a tela de Marketing é um "em breve". Copiar a feature do
    // catálogo para o prompt fez o Barry vender vapor por R$ 99,90 — quem
    // comprasse por isso abriria o painel e leria "estamos preparando".
    //
    // A palavra pode aparecer, mas só na linha que PROÍBE prometer. Conferir
    // a ausência dela seria reprovar justamente a defesa.
    for (const [nome, prompt] of [['Barry', barry], ['Cacau', cacau]] as const) {
      const citam = prompt.split('\n').filter((linha) => /cupom|cupons/i.test(linha));
      for (const linha of citam) {
        expect(`${nome}: ${linha.trim()}`).toMatch(/^\w+: N[ãa]o promete CUPOM/);
      }
    }
  });
});

describe('o endereço', () => {
  it('é barbeariabrutal.com nos dois, e o errado nunca aparece como link', () => {
    // O domínio .com.br não existe. Ele só pode aparecer na linha que ensina
    // a NÃO usá-lo.
    expect(barry).toContain('https://barbeariabrutal.com');
    expect(cacau).toContain('https://barbeariabrutal.com');
    expect(barry).not.toContain('https://www.barbeariabrutal.com.br');
    expect(cacau).not.toContain('barbeariabrutal.com.br');
  });
});
