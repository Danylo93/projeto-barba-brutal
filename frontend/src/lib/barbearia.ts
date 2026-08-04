/**
 * Nome da barbearia como o cliente final vê: sempre precedido de "Barbearia".
 *
 * O dono cadastra o nome como quiser — uns escrevem "do Marcão", outros já
 * escrevem "Barbearia do Marcão". Prefixar sem olhar produziria "Barbearia
 * Barbearia do Marcão", então a palavra só entra quando ainda não está lá.
 */
const JA_TEM_PREFIXO = /^\s*(barbearia|barbearias|barber\s*shop|barbershop|barber|salão|salao)\b/i

export function nomeDaBarbearia(nome?: string | null): string {
    const limpo = (nome ?? '').trim().replace(/\s+/g, ' ')
    if (!limpo) return 'Barbearia'
    if (JA_TEM_PREFIXO.test(limpo)) return limpo
    return `Barbearia ${limpo}`
}

/**
 * Quebra o nome em duas partes para a marca bicolor do cabeçalho:
 * "Barbearia" em branco, o resto na cor da barbearia.
 */
export function partesDoNome(nome?: string | null): [string, string] {
    const completo = nomeDaBarbearia(nome)
    const [primeira, ...resto] = completo.split(' ')
    return [primeira, resto.join(' ')]
}
