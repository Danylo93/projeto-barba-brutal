/**
 * CPF/CNPJ no navegador — mesma regra do backend, para o barbeiro descobrir o
 * erro enquanto digita em vez de depois de enviar o formulário.
 *
 * O backend valida de novo: isto aqui é conforto, não é a trava.
 */

export function limparDocumento(valor: string): string {
    return (valor || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
}

function validarCPF(valor: string): boolean {
    const cpf = limparDocumento(valor)
    if (!/^\d{11}$/.test(cpf)) return false
    if (/^(\d)\1{10}$/.test(cpf)) return false

    for (const [tamanho, posicao] of [
        [9, 10],
        [10, 11],
    ]) {
        let soma = 0
        for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (posicao - i)
        const resto = (soma * 10) % 11
        if ((resto === 10 ? 0 : resto) !== Number(cpf[tamanho])) return false
    }
    return true
}

function validarCNPJ(valor: string): boolean {
    const cnpj = limparDocumento(valor)
    // Desde julho de 2026 o CNPJ novo pode ter letras nas 12 primeiras posições.
    if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false
    if (/^(\d)\1{13}$/.test(cnpj)) return false

    const calcular = (tamanho: number) => {
        let peso = 2
        let soma = 0
        for (let i = tamanho - 1; i >= 0; i--) {
            soma += (cnpj.charCodeAt(i) - 48) * peso
            peso = peso === 9 ? 2 : peso + 1
        }
        const resto = soma % 11
        return resto < 2 ? 0 : 11 - resto
    }
    return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13])
}

export function documentoValido(valor: string): boolean {
    const d = limparDocumento(valor)
    if (d.length === 11) return validarCPF(d)
    if (d.length === 14) return validarCNPJ(d)
    return false
}

/** Mensagem para o usuário, ou null quando está tudo certo. */
export function validarDocumento(valor: string): string | null {
    const d = limparDocumento(valor)
    if (!d) return 'Informe o CPF ou o CNPJ da barbearia'
    if (d.length !== 11 && d.length !== 14) {
        return 'CPF tem 11 dígitos e CNPJ tem 14'
    }
    if (!documentoValido(d)) {
        return d.length === 11 ? 'CPF inválido' : 'CNPJ inválido'
    }
    return null
}

/** Máscara progressiva enquanto digita. */
export function formatarDocumentoInput(valor: string): string {
    const d = limparDocumento(valor).slice(0, 14)

    if (d.length <= 11) {
        return d
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
    }
    return d
        .replace(/^([0-9A-Z]{2})([0-9A-Z])/, '$1.$2')
        .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})([0-9A-Z])/, '$1.$2.$3')
        .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})\.([0-9A-Z]{3})([0-9A-Z])/, '$1.$2.$3/$4')
        .replace(
            /^([0-9A-Z]{2})\.([0-9A-Z]{3})\.([0-9A-Z]{3})\/([0-9A-Z]{4})(\d)/,
            '$1.$2.$3/$4-$5',
        )
}
