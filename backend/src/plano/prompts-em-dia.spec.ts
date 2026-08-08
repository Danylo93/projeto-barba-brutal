import { readFileSync } from 'fs';
import { join } from 'path';
import { CATALOGO, MESES_COBRADOS_NO_ANUAL, precoAnual, SEM_LIMITE } from './catalogo';
import { DIAS_DE_ARREPENDIMENTO } from '../assinatura/politica-de-cancelamento';

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

/**
 * Os mesmos dois prompts, agora lidos de dentro do fluxo do n8n.
 *
 * Os arquivos `.md` acima são a fonte que a gente edita; o que ATENDE o
 * cliente é o `systemMessage` colado no nó. Conferir só o markdown deixa
 * passar o caso mais provável de todos: alguém atualiza o arquivo, esquece de
 * colar no n8n, e o robô segue vendendo pelo preço velho com o repositório
 * dizendo que está tudo certo.
 */
const FLUXO_COMERCIAL = join(
  __dirname,
  '..',
  '..',
  '..',
  'n8n',
  'Barbearia Brutal — comercial (Barry e Cacau).json',
);

function promptDoNo(nomeDoNo: string): string {
  const fluxo = JSON.parse(readFileSync(FLUXO_COMERCIAL, 'utf8'));
  const no = (fluxo.nodes ?? []).find((n: any) => n.name === nomeDoNo);
  if (!no) throw new Error(`o fluxo comercial não tem o nó ${nomeDoNo}`);
  const texto = no.parameters?.options?.systemMessage;
  if (!texto) throw new Error(`o nó ${nomeDoNo} está sem systemMessage`);
  // O `=` da frente é do n8n, marcando o campo como expressão.
  return String(texto).replace(/^=/, '');
}

const noFluxo: Record<string, string> = {
  Barry: promptDoNo('Barry').replace(/\s+/g, ' '),
  Cacau: promptDoNo('Cacau').replace(/\s+/g, ' '),
};

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
    // O cupom foi retirado do produto: saiu do catálogo, saiu da vitrine e a
    // tela de Marketing — que era só um "em breve" — deixou de existir. Antes
    // disso o Barry vendia Premium citando cupom, e quem comprasse por causa
    // dele abriria o painel e leria "estamos preparando".
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

describe('o que está colado no n8n conta a mesma história', () => {
  it('o Barry do fluxo cobra o preço mensal do catálogo', () => {
    for (const plano of CATALOGO) {
      expect(noFluxo.Barry).toContain(`R$ ${comoOTextoEscreve(plano.precoMensal)}`);
    }
  });

  it('o Barry do fluxo cobra o anual do catálogo', () => {
    for (const plano of CATALOGO) {
      const anual = Math.round(precoAnual(plano.precoMensal));
      expect(noFluxo.Barry).toMatch(new RegExp(`R\\$ ${anual}\\b`));
    }
  });

  it.each(['Barry', 'Cacau'])('o %s do fluxo não carrega preço aposentado', (quem) => {
    // R$ 99,90 é o Premium de hoje, então só o 159,90 é sempre proibido.
    const vivos = CATALOGO.map((p) => `R$ ${comoOTextoEscreve(p.precoMensal)}`);
    for (const antigo of ['R$ 159,90']) {
      if (vivos.includes(antigo)) continue;
      expect(noFluxo[quem]).not.toContain(antigo);
    }
  });

  it.each(['Barry', 'Cacau'])('o %s do fluxo não promete teto de barbeiros', (quem) => {
    // "até 5 barbeiros" era o texto do fluxo antigo, e o teto não existe mais.
    expect(noFluxo[quem]).not.toMatch(/at[ée] \d+ (barbeiros|profissionais)/i);
  });

  it('o fluxo não põe o robô no Premium sozinho', () => {
    // O prompt antigo dizia "Premium possui Robô de WhatsApp com IA", o que
    // faz o Barry esconder do cliente que o Profissional, mais barato, também
    // tem — e faz a venda parecer mais cara do que precisa ser.
    expect(noFluxo.Barry).toMatch(/Profissional e no Premium/i);
  });

  it.each(['Barry', 'Cacau'])('o %s do fluxo não promete cupom', (quem) => {
    const linhas = promptDoNo(quem)
      .split('\n')
      .filter((linha) => /cupom|cupons/i.test(linha));
    for (const linha of linhas) {
      expect(linha.trim()).toMatch(/^N[ãa]o promete CUPOM/);
    }
  });

  it('o endereço certo está nos dois, e o inexistente nunca como link', () => {
    // O `.com.br` não existe, mas PODE aparecer — o prompt do Barry tem uma
    // linha inteira ensinando a não usá-lo. O que não pode é ele aparecer
    // escrito como link, que é a forma que o agente copiaria para o cliente.
    for (const quem of ['Barry', 'Cacau']) {
      expect(noFluxo[quem]).toContain('https://barbeariabrutal.com');
      expect(noFluxo[quem]).not.toMatch(/https?:\/\/(www\.)?barbeariabrutal\.com\.br/);
    }
  });

  it('o roteador manda para SUPORTE e VENDAS, do jeito que o Switch compara', () => {
    // O Switch compara `setor` com as strings exatas SUPORTE e VENDAS. O
    // prompt anterior classificava por "segunda via de boleto" e "mentoria
    // particular" — critério de outro negócio, herdado do template. Conversa
    // de barbearia não casava com nenhum dos dois, então a Cacau nunca
    // recebia ninguém e o Barry atendia até quem estava com a conta quebrada.
    const gerente = promptDoNo('Gerente Setor');
    expect(gerente).toContain('SUPORTE');
    expect(gerente).toContain('VENDAS');
    expect(gerente).not.toMatch(/boleto|mentoria/i);
  });
});

describe('a política de cancelamento é a mesma no código e na boca dos dois', () => {
  it('os dois citam os 7 dias de arrependimento', () => {
    // O número mora em `politica-de-cancelamento.ts`. Se ele mudar lá e não
    // aqui, o Barry passa a prometer um prazo que o sistema não cumpre.
    for (const quem of ['Barry', 'Cacau']) {
      expect(noFluxo[quem]).toMatch(new RegExp(`${DIAS_DE_ARREPENDIMENTO} dias`));
    }
  });

  it('nenhum promete devolução proporcional depois dos 7 dias', () => {
    // O sistema não faz conta proporcional no cancelamento: ele mantém o
    // acesso até o fim do período pago. Prometer dinheiro de volta seria
    // vender uma regra que o código não executa.
    for (const quem of ['Barry', 'Cacau']) {
      expect(noFluxo[quem]).not.toMatch(/proporcional/i);
    }
  });

  it('a Cacau diz que o acesso segue até o fim do período pago', () => {
    expect(noFluxo.Cacau).toMatch(/at[ée] o fim do per[íi]odo j[áa] pago/i);
  });

  it('e "não dá para cancelar" só aparece na linha que proíbe dizer isso', () => {
    // Terceira vez que caio nesta: a linha de defesa contém a frase proibida.
    // Conferir a ausência da frase reprovaria justamente quem a proíbe — o que
    // vale checar é se ela aparece em algum lugar ALÉM da proibição.
    for (const quem of ['Barry', 'Cacau']) {
      const linhas = promptDoNo(quem)
        .split('\n')
        .filter((linha) => /n[ãa]o d[áa] para cancelar/i.test(linha));
      for (const linha of linhas) {
        expect(linha.trim()).toMatch(/^Nunca diga/);
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
