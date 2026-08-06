/**
 * Regras do e-mail de acesso do profissional — funções puras, sem Prisma.
 *
 * O e-mail é obrigatório porque é ele que dá ao barbeiro a agenda própria.
 * Antes dava para cadastrar profissional sem e-mail (e ele nunca entrava no
 * sistema) ou com e-mail e sem senha (a conta simplesmente não era criada, sem
 * aviso nenhum — o dono achava que tinha dado acesso).
 */

/** Tira espaço das pontas. Não mexe na caixa: o login compara exato. */
export function normalizarEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim() : '';
}

/**
 * Mesma caixa postal?
 *
 * A comparação é sem caixa alta de propósito: o Postgres deixaria
 * "Marcao@x.app" e "marcao@x.app" conviverem, mas é o mesmo e-mail, e o
 * barbeiro acabaria com duas contas — entrando ora numa, ora noutra.
 */
export function mesmoEmail(a: unknown, b: unknown): boolean {
  const x = normalizarEmail(a).toLowerCase();
  const y = normalizarEmail(b).toLowerCase();
  return x !== '' && x === y;
}

export const EMAIL_JA_USADO =
  'Já existe alguém nesta barbearia com esse e-mail. Use outro endereço.';

export const NOME_JA_USADO =
  'Já existe um profissional com este nome nesta barbearia.';

/**
 * Descrição e foto: o formulário não pede, o banco exige.
 *
 * `Profissional.descricao` é `String` (não `String?`) no schema, mas o DTO
 * marca como opcional. Cadastrar um barbeiro sem escrever descrição mandava
 * `undefined` ao Prisma e virava 500 — com a conta de acesso dele já criada
 * antes, o que ainda queimava o e-mail para a segunda tentativa.
 */
export function enfeitesDoProfissional(data: {
  descricao?: string | null;
  imagemUrl?: string | null;
}): { descricao: string; imagemUrl: string } {
  return {
    descricao: data?.descricao || '',
    imagemUrl: data?.imagemUrl || '',
  };
}
