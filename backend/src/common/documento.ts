/**
 * Validação de CPF e CNPJ pelo dígito verificador.
 *
 * Conferir só o tamanho não serve para nada: "11111111111" tem 11 dígitos e
 * seria aceito, e é exatamente o que alguém digita para abrir conta atrás de
 * conta. Aqui o cálculo é o de verdade.
 *
 * CNPJ alfanumérico: desde julho de 2026 os CNPJs novos podem ter letras nas
 * doze primeiras posições (os dois dígitos verificadores continuam numéricos).
 * O cálculo é o mesmo, trocando cada caractere pelo seu código ASCII menos 48
 * — para os dígitos de 0 a 9 isso devolve o próprio valor, então a regra
 * antiga continua valendo sem exceção.
 */

export type TipoDocumento = 'cpf' | 'cnpj';

/** Deixa só o que interessa: dígitos, e letras maiúsculas no caso do CNPJ. */
export function limparDocumento(valor: string): string {
  return (valor || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function valorDoCaractere(c: string): number {
  return c.charCodeAt(0) - 48;
}

export function validarCPF(valor: string): boolean {
  const cpf = limparDocumento(valor);
  if (!/^\d{11}$/.test(cpf)) return false;
  // Todos os dígitos iguais passam na conta dos verificadores, mas não existem.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (const [tamanho, posicao] of [
    [9, 10],
    [10, 11],
  ]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (posicao - i);
    }
    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}

export function validarCNPJ(valor: string): boolean {
  const cnpj = limparDocumento(valor);
  // 12 posições alfanuméricas + 2 dígitos verificadores numéricos.
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcular = (tamanho: number) => {
    let peso = 2;
    let soma = 0;
    for (let i = tamanho - 1; i >= 0; i--) {
      soma += valorDoCaractere(cnpj[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13])
  );
}

export function tipoDoDocumento(valor: string): TipoDocumento | null {
  const limpo = limparDocumento(valor);
  if (limpo.length === 11) return validarCPF(limpo) ? 'cpf' : null;
  if (limpo.length === 14) return validarCNPJ(limpo) ? 'cnpj' : null;
  return null;
}

export function documentoValido(valor: string): boolean {
  return tipoDoDocumento(valor) !== null;
}

/** Formata para exibição: 000.000.000-00 ou 00.000.000/0000-00. */
export function formatarDocumento(valor: string): string {
  const d = limparDocumento(valor);
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(
      /^([0-9A-Z]{2})([0-9A-Z]{3})([0-9A-Z]{3})([0-9A-Z]{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }
  return d;
}
