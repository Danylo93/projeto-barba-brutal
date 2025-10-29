// Tipos e interfaces para o sistema de barbearias

export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  barbeiro: boolean;
  tenantId: number;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Agendamento {
  id?: number;
  data: Date;
  profissionalId: number;
  servicos: number[];
  usuarioId: number;
  tenantId: number;
  status?: string;
  observacoes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interfaces para repositórios
export interface RepositorioUsuario {
  salvar(usuario: Usuario): Promise<void>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
}

export interface RepositorioAgendamento {
  salvar(agendamento: Agendamento): Promise<void>;
  buscarPorUsuario(usuarioId: number): Promise<Agendamento[]>;
  buscarPorProfissional(profissionalId: number, data: Date): Promise<Agendamento[]>;
}

// Interface para provedor de criptografia
export interface ProvedorCriptografia {
  criptografar(senha: string): Promise<string>;
  comparar(senha: string, hash: string): Promise<boolean>;
}

// Classes de casos de uso
export class LoginUsuario {
  constructor(
    private repo: RepositorioUsuario,
    private cripto: ProvedorCriptografia
  ) {}

  async executar(email: string, senha: string): Promise<Usuario> {
    const usuario = await this.repo.buscarPorEmail(email);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const senhaValida = await this.cripto.comparar(senha, usuario.senha);
    if (!senhaValida) {
      throw new Error('Senha inválida');
    }

    return usuario;
  }
}

export class RegistrarUsuario {
  constructor(
    private repo: RepositorioUsuario,
    private cripto: ProvedorCriptografia
  ) {}

  async executar(usuario: Usuario): Promise<void> {
    const usuarioExistente = await this.repo.buscarPorEmail(usuario.email);
    if (usuarioExistente) {
      throw new Error('Usuário já existe');
    }

    const senhaCriptografada = await this.cripto.criptografar(usuario.senha);
    usuario.senha = senhaCriptografada;

    await this.repo.salvar(usuario);
  }
}

// Classe para obter horários ocupados
export class ObterHorariosOcupados {
  constructor(private repo: RepositorioAgendamento) {}

  async executar(profissionalId: number, data: Date): Promise<Date[]> {
    const agendamentos = await this.repo.buscarPorProfissional(profissionalId, data);
    return agendamentos.map(agendamento => agendamento.data);
  }
}
