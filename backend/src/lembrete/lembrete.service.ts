import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

const MINUTOS_POR_SLOT = 30;

/**
 * Consulta de agendamentos para lembretes (consumida pelo n8n/Evolution).
 * Retorna os agendamentos que começam dentro de uma janela à frente
 * (ex.: entre 60 e 65 min a partir de agora), com os dados necessários
 * para o WhatsApp: cliente, barbeiro, telefones, serviços e horário.
 */
@Injectable()
export class LembreteService {
  constructor(private readonly prisma: PrismaService) {}

  async proximos(minutosAntes: number, janelaMin: number) {
    const agora = new Date();
    const inicio = new Date(agora.getTime() + minutosAntes * 60000);
    const fim = new Date(inicio.getTime() + janelaMin * 60000);

    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        data: { gte: inicio, lt: fim },
        status: { in: ['agendado', 'confirmado'] },
      },
      include: {
        usuario: true,
        profissional: { include: { usuario: true } },
        servicos: true,
        tenant: true,
      },
      orderBy: { data: 'asc' },
    });

    return agendamentos.map((a) => {
      const totalMin = (a.servicos ?? []).reduce(
        (acc, s) => acc + (s.qtdeSlots ?? 1) * MINUTOS_POR_SLOT,
        0,
      );
      const horario = new Date(a.data).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });
      const data = new Date(a.data).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });
      return {
        id: a.id,
        barbearia: a.tenant?.nome ?? 'Barbearia',
        data,
        horario,
        duracaoMin: totalMin,
        servicos: (a.servicos ?? []).map((s) => s.nome),
        cliente: {
          nome: a.usuario?.nome ?? 'Cliente',
          telefone: a.usuario?.telefone ?? null,
        },
        barbeiro: {
          nome: a.profissional?.nome ?? null,
          telefone: a.profissional?.usuario?.telefone ?? null,
        },
      };
    });
  }
}
