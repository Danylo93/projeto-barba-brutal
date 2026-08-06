import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../db/prisma.service';
import { AgendamentoRepository } from '../agendamento/agendamento.repository';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WhatsappAgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agendamentos: AgendamentoRepository,
    private readonly whatsapp: WhatsappService,
  ) {}

  private normalizarInstance(valor: string): string {
    return String(valor ?? '').trim().toLowerCase();
  }

  private autenticar(token: string, tenantTexto: string): number {
    const tenantId = Number(tenantTexto);
    if (!Number.isInteger(tenantId) || tenantId < 1) throw new BadRequestException('tenantId inválido.');
    const tokenGlobal = String(process.env.WHATSAPP_BOT_TOKEN || '').trim();
    let tokens: Record<string, string> = {};
    try {
      tokens = JSON.parse(process.env.WHATSAPP_BOT_TOKENS || '{}');
    } catch {
      throw new UnauthorizedException('WHATSAPP_BOT_TOKENS inválido no backend.');
    }
    if (tokenGlobal && token === tokenGlobal) return tenantId;
    const esperado = tokens[String(tenantId)];
    if (!esperado || token !== esperado) throw new UnauthorizedException('Token do WhatsApp inválido.');
    return tenantId;
  }

  async resolverPorInstance(instance: string) {
    const normalizada = this.normalizarInstance(instance);
    if (!normalizada) throw new BadRequestException('instance inválida.');

    const tenants = await this.prisma.tenant.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, configuracoes: true },
    });

    const tenant = tenants.find((t) => {
      const conf = (t.configuracoes as any) || {};
      const inst = this.normalizarInstance(conf.evolutionInstance || conf.instance || conf.whatsappInstance);
      return inst === normalizada;
    });

    if (!tenant) {
      throw new NotFoundException('Nenhum tenant encontrado para esta instance da Evolution.');
    }

    return {
      tenantId: tenant.id,
      tenantNome: tenant.nome,
    };
  }

  private digitos(valor: string): string {
    const numero = String(valor ?? '').replace(/\D/g, '');
    if (numero.length < 10) throw new BadRequestException('Telefone inválido.');
    return numero.startsWith('55') ? numero : `55${numero}`;
  }

  private telefoneCanonico(valor: string): string | null {
    const numero = String(valor ?? '').replace(/\D/g, '');
    if (numero.length < 10) return null;
    return numero.startsWith('55') ? numero : `55${numero}`;
  }

  private async cliente(tenantId: number, telefone: string, nome?: string, criar = false) {
    const numero = this.digitos(telefone);
    const usuarios = await this.prisma.usuario.findMany({ where: { tenantId, ativo: true } });
    let usuario = usuarios.find((u) => this.telefoneCanonico(u.telefone) === numero);
    if (!usuario && criar) {
      const senha = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      usuario = await this.prisma.usuario.create({
        data: {
          tenantId,
          nome: String(nome || 'Cliente WhatsApp').slice(0, 100),
          telefone: numero,
          email: `whatsapp.${numero}.${tenantId}@cliente.local`,
          senha,
        },
      });
    }
    if (!usuario) throw new NotFoundException('Cliente não encontrado para este telefone.');
    return usuario;
  }

  async catalogo(token: string, tenantTexto: string) {
    const tenantId = this.autenticar(token, tenantTexto);
    const [tenant, servicos, profissionais] = await Promise.all([
      this.prisma.tenant.findFirst({ where: { id: tenantId, ativo: true }, select: { id: true, nome: true } }),
      this.prisma.servico.findMany({ where: { tenantId, ativo: true }, select: { id: true, nome: true, preco: true, qtdeSlots: true } }),
      this.prisma.profissional.findMany({ where: { tenantId, ativo: true }, select: { id: true, nome: true, servicos: { select: { id: true } } } }),
    ]);
    if (!tenant) throw new NotFoundException('Barbearia não encontrada.');
    return { tenant, servicos, profissionais };
  }

  async listar(token: string, tenantTexto: string, telefone: string) {
    const tenantId = this.autenticar(token, tenantTexto);
    const usuario = await this.cliente(tenantId, telefone);
    return this.agendamentos.buscarPorUsuario(usuario.id);
  }

  async criar(token: string, tenantTexto: string, body: any) {
    const tenantId = this.autenticar(token, tenantTexto);
    const usuario = await this.cliente(tenantId, body.telefone, body.nome, true);
    const id = await this.agendamentos.salvar({
      tenantId,
      usuarioId: usuario.id,
      profissionalId: Number(body.profissionalId),
      servicos: Array.isArray(body.servicos) ? body.servicos.map(Number) : [Number(body.servicoId)],
      data: body.data,
      observacoes: body.observacoes,
    } as any);
    return this.agendamentos.buscarPorId(id, tenantId);
  }

  private async doCliente(tenantId: number, idTexto: string, telefone: string) {
    const id = Number(idTexto);
    if (!Number.isInteger(id)) throw new BadRequestException('Agendamento inválido.');
    const usuario = await this.cliente(tenantId, telefone);
    const agendamento = await this.agendamentos.buscarPorId(id, tenantId);
    if (!agendamento || agendamento.usuarioId !== usuario.id) throw new NotFoundException('Agendamento não encontrado para este cliente.');
    return agendamento;
  }

  async cancelar(token: string, tenantTexto: string, idTexto: string, telefone: string) {
    const tenantId = this.autenticar(token, tenantTexto);
    const agendamento = await this.doCliente(tenantId, idTexto, telefone);
    if (agendamento.status === 'cancelado') return { id: agendamento.id, status: 'cancelado' };
    if (agendamento.status === 'concluido') throw new BadRequestException('Agendamento já concluído.');
    await this.agendamentos.atualizarStatus(agendamento.id, tenantId, 'cancelado');
    const completo = await this.prisma.agendamento.findUnique({
      where: { id: agendamento.id },
      include: { usuario: true, profissional: { include: { usuario: true } }, tenant: true },
    });
    const textoCliente = `Seu agendamento #${agendamento.id} na ${completo?.tenant.nome ?? 'barbearia'} foi cancelado.`;
    const textoBarbeiro = `Agendamento #${agendamento.id} de ${completo?.usuario.nome ?? 'cliente'} foi cancelado pelo WhatsApp.`;
    await Promise.all([
      completo?.usuario.telefone ? this.whatsapp.enviarTexto(completo.usuario.telefone, textoCliente) : false,
      completo?.profissional.usuario?.telefone
        ? this.whatsapp.enviarTexto(completo.profissional.usuario.telefone, textoBarbeiro)
        : false,
    ]);
    return { id: agendamento.id, status: 'cancelado' };
  }

  async reagendar(token: string, tenantTexto: string, idTexto: string, body: { telefone?: string; data?: string }) {
    const tenantId = this.autenticar(token, tenantTexto);
    const agendamento = await this.doCliente(tenantId, idTexto, body.telefone || '');
    if (!body.data) throw new BadRequestException('Nova data é obrigatória.');
    if (['cancelado', 'concluido'].includes(agendamento.status)) throw new BadRequestException('Este agendamento não pode ser reagendado.');
    await this.agendamentos.reagendar(agendamento.id, tenantId, new Date(body.data));
    return this.agendamentos.buscarPorId(agendamento.id, tenantId);
  }
}
