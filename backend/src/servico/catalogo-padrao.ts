/**
 * Catálogo de serviços com que a barbearia começa.
 *
 * Antes a barbearia nascia sem serviço nenhum e o dono tinha que cadastrar
 * tudo na mão antes da primeira tela funcionar. Agora ela já entra com esta
 * lista — a mesma dos serviços para os quais o sistema tem foto — e o dono
 * renomeia, muda o preço ou apaga o que não faz.
 *
 * A imagem é gravada de propósito: a tela sabe derivar a foto pelo nome, mas
 * se o dono renomeia "Corte de Cabelo" para "Degradê na Régua" a foto sumiria
 * junto. Com a URL gravada, renomear não mexe na vitrine.
 */

export interface ServicoPadrao {
  nome: string;
  descricao: string;
  preco: number;
  /** Blocos de 30 minutos. */
  qtdeSlots: number;
  ehCombo: boolean;
  imagemURL: string;
  /**
   * Trechos que, aparecendo no nome de um serviço já cadastrado, indicam que a
   * barbearia JÁ oferece este aqui — "Corte de Barba" e "Barba" são a mesma
   * coisa, e criar os dois deixaria o cliente escolhendo entre duplicatas.
   */
  contem: string[];
  /**
   * Nomes que só valem por igualdade exata. "corte" está aqui, e não em
   * `contem`, porque "Corte de Barba" contém "corte" sem ser um corte de
   * cabelo — a barbearia ficaria sem o serviço principal.
   */
  exatos?: string[];
}

export const CATALOGO_PADRAO: ServicoPadrao[] = [
  {
    nome: 'Corte de Cabelo',
    descricao: 'Corte na máquina ou tesoura, do clássico ao degradê, com acabamento na navalha.',
    preco: 45,
    qtdeSlots: 1,
    ehCombo: false,
    imagemURL: '/servicos/corte-de-cabelo.jpg',
    contem: ['cabelo'],
    exatos: ['corte'],
  },
  {
    nome: 'Barba',
    descricao: 'Toalha quente, navalha e alinhamento do contorno.',
    preco: 35,
    qtdeSlots: 1,
    ehCombo: false,
    imagemURL: '/servicos/corte-de-barba.jpg',
    contem: ['barba'],
  },
  {
    nome: 'Combo Corte + Barba',
    descricao: 'O corte completo e a barba feita, na mesma cadeira e por um preço só.',
    preco: 70,
    qtdeSlots: 2,
    ehCombo: true,
    imagemURL: '/servicos/combo.jpg',
    contem: ['combo', 'corte + barba', 'corte e barba'],
  },
  {
    nome: 'Corte Infantil',
    descricao: 'Corte com paciência para os pequenos, sem drama e sem pressa.',
    preco: 40,
    qtdeSlots: 1,
    ehCombo: false,
    imagemURL: '/servicos/corte-infantil.jpg',
    contem: ['infantil', 'kids', 'crianc'],
  },
  {
    nome: 'Dia do Noivo',
    descricao: 'Corte, barba, hidratação e cuidado completo para o grande dia.',
    preco: 180,
    qtdeSlots: 4,
    ehCombo: true,
    imagemURL: '/servicos/dia-de-noivo.jpg',
    contem: ['noiv'],
  },
  {
    nome: 'Manicure e Pedicure',
    descricao: 'Mãos e pés tratados, com corte de unha e cutícula.',
    preco: 50,
    qtdeSlots: 2,
    ehCombo: false,
    imagemURL: '/servicos/manicure-pedicure.jpg',
    contem: ['manicure', 'pedicure', 'unha'],
  },
];

/** Minúsculas e sem acento, para "Degradê" bater com "degrade". */
export function normalizarNome(texto: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A barbearia já oferece este serviço, ainda que com outro nome? */
function jaOferece(padrao: ServicoPadrao, nomesExistentes: string[]): boolean {
  const contem = padrao.contem.map(normalizarNome);
  const exatos = [normalizarNome(padrao.nome), ...(padrao.exatos ?? []).map(normalizarNome)];

  return nomesExistentes.some(
    (nome) => exatos.includes(nome) || contem.some((trecho) => nome.includes(trecho)),
  );
}

/** Quais serviços do catálogo a barbearia ainda não tem. */
export function servicosQueFaltam(existentes: { nome: string }[] = []): ServicoPadrao[] {
  const nomes = existentes.map((s) => normalizarNome(s.nome));
  return CATALOGO_PADRAO.filter((padrao) => !jaOferece(padrao, nomes));
}

/** O que vai para o `prisma.servico.createMany`. */
export function paraCriar(padrao: ServicoPadrao, tenantId: number) {
  return {
    nome: padrao.nome,
    descricao: padrao.descricao,
    preco: padrao.preco,
    qtdeSlots: padrao.qtdeSlots,
    ehCombo: padrao.ehCombo,
    imagemURL: padrao.imagemURL,
    tenantId,
  };
}
