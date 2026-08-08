// Tipos e interfaces para o sistema de barbearias
import { horarioEstaSegurado } from '../sinal/sinal';

export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  barbeiro: boolean;
  tenantId: number;
  tipo?: string;
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
  /** Sempre dentro de uma barbearia: o mesmo e-mail existe em várias. */
  buscarPorEmail(email: string, tenantId: number): Promise<Usuario | null>;
  buscarNoTenant(id: number, tenantId: number): Promise<Usuario | null>;
}

export interface RepositorioAgendamento {
  salvar(agendamento: Agendamento): Promise<number>;
  buscarPorUsuario(usuarioId: number): Promise<Agendamento[]>;
  buscarPorProfissional(profissionalId: number, data: Date | string, tenantId: number): Promise<Agendamento[]>;
  /** Bloqueios (folga/almoço/férias) que afetam o profissional no dia. */
  buscarBloqueios?(profissionalId: number, data: Date | string, tenantId: number): Promise<{ inicio: Date; fim: Date }[]>;
}

// Interface para provedor de criptografia
export interface ProvedorCriptografia {
  criptografar(senha: string): Promise<string>;
  comparar(senha: string, hash: string): Promise<boolean>;
}

export class ObterHorariosOcupados {
  constructor(private repo: RepositorioAgendamento) {}

  async executar(profissionalId: number, data: Date | string, tenantId: number): Promise<string[]> {
    const agendamentos = await this.repo.buscarPorProfissional(profissionalId, data, tenantId);
    
    // Duas coisas tiram um horário da disponibilidade, e as duas valem.
    //
    // Pelo STATUS: só agendado e confirmado ocupam. Cancelado, concluído e
    // expirado são histórico. A lista fechada é melhor que negar 'cancelado'
    // um a um — status novo entra sem ocupar agenda por engano, que foi
    // justamente o caso do 'expirado'.
    //
    // Pelo SINAL: quem não pagou no prazo devolveu a vaga. Sem isso a
    // barbearia perde o horário duas vezes — o cliente não veio e ninguém
    // mais conseguiu marcar.
    const ativos = agendamentos.filter(
      (a: any) =>
        ['agendado', 'confirmado'].includes(String(a.status ?? 'agendado')) &&
        horarioEstaSegurado(a),
    );
    const ocupados: string[] = [];

    for (const agendamento of ativos) {
      // Pega a quantidade de slots total (ex: 2 serviços de 1 slot = 2)
      // Como o repositório formata servicos com qtdeSlots no runtime, lemos como any
      const servicos = (agendamento as any).servicos || [];
      const totalSlots = servicos.reduce((acc: number, s: any) => acc + (s.qtdeSlots || 1), 0) || 1;

      // Pega a data de início
      let dataSlot = new Date(agendamento.data);
      for (let i = 0; i < totalSlots; i++) {
        // Formata para o timezone do Brasil para garantir a string no formato HH:mm correto
        const horaStr = dataSlot.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
        });
        ocupados.push(horaStr);
        // Avança 30 minutos (1 slot)
        dataSlot.setMinutes(dataSlot.getMinutes() + 30);
      }
    }

    // Slots cobertos por bloqueios (folga, almoço, férias) também ficam indisponíveis.
    const bloqueios = (await this.repo.buscarBloqueios?.(profissionalId, data, tenantId)) ?? [];
    if (bloqueios.length) {
      const inicioDoDia = new Date(data);
      inicioDoDia.setHours(0, 0, 0, 0);
      for (let i = 0; i < 48; i++) {
        const slotInicio = new Date(inicioDoDia.getTime() + i * 30 * 60000);
        const slotFim = new Date(slotInicio.getTime() + 30 * 60000);
        const bloqueado = bloqueios.some(
          (b) => slotInicio < b.fim && b.inicio < slotFim,
        );
        if (!bloqueado) continue;
        const horaStr = slotInicio.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
        });
        if (!ocupados.includes(horaStr)) ocupados.push(horaStr);
      }
    }

    return ocupados;
  }
}
