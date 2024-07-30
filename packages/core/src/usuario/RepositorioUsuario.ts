import Usuario from './Usuario'

export default interface RepositorioUsuario {
    salvar(usuario: Usuario): Promise<void>
    buscarPorEmail(email: string): Promise<Usuario>
}
