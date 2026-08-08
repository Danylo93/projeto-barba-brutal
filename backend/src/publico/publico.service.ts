import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../db/prisma.service';
import { AgendamentoRepository } from '../agendamento/agendamento.repository';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { LgpdService } from '../lgpd/lgpd.service';
import { ObterHorariosOcupados } from '../types';
import { VERSAO_PRIVACIDADE, VERSAO_TERMOS } from '../lgpd/versoes';

/**
 * Agendamento sem cadastro.
 *
 * O cliente entra na página da barbearia, escolhe serviço, profissional e
 * horário, escreve nome e WhatsApp, e pronto. Sem senha, sem confirmar
 * e-mail, sem app.
 *
 * ── Por que isto não é um buraco de segurança ──
 *
 * Este é o único caminho da API que grava sem token, então cada decisão aqui
 * é deliberada:
 *
 * 1. A barbearia vem do ENDEREÇO (o slug da URL), nunca do corpo. Mandar
 *    `tenantId` no JSON não muda nada — é o que impede marcar na agenda de
 *    outra barbearia.
 * 2. A resposta devolve SÓ o agendamento recém-criado, montado campo a
 *    campo. Nada de listar, consultar por telefone ou devolver dado de
 *    terceiro — senão bastaria digitar números de telefone para descobrir
 *    quem se corta onde. A resposta chegou a trazer um `novaConta`, que era
 *    exatamente esse bit ("este telefone já é cliente daqui?"); saiu, porque
 *    a tela não precisava dele para nada.
 * 3. A conta criada nasce `semCadastro`, com senha aleatória que ninguém
 *    conhece — nem nós. Ela não serve para entrar em lugar nenhum até a
 *    pessoa definir a própria senha pelo link de primeiro acesso.
 * 4. Se o WhatsApp já tem conta de verdade, ela é REUTILIZADA, e nada dela é
 *    devolvido nem alterado além do agendamento novo. Sobrescrever o nome
 *    deixaria qualquer um renomear a conta alheia sabendo o telefone.
 * 5. O limite de requisições é do throttler global, por IP.
 */
@Injectable()
export class PublicoService {
  private readonly logger = new Logger(PublicoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agendamentos: AgendamentoRepository,
    private readonly notificacao: NotificacaoService,
    private readonly lgpd: LgpdService,
  ) {}

  /**
   * Acha a barbearia pelo endereço público e confere se ela aceita
   * agendamento sem cadastro.
   */
  private async barbeariaDoEndereco(dominio: string) {
    const identificador = String(dominio ?? '').trim().toLowerCase();
    if (!identificador) throw new NotFoundException('Barbearia não encontrada.');

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        ativo: true,
        OR: [
          { dominio: identificador },
          { dominiosAntigos: { has: identificador } },
        ],
      },
      select: { id: true, nome: true, agendamentoSemConta: true },
    });
    if (!tenant) throw new NotFoundException('Barbearia não encontrada.');

    return tenant;
  }

  /** Horários já ocupados de um profissional num dia. */
  async horariosOcupados(dominio: string, profissionalId: number, data: string) {
    const tenant = await this.barbeariaDoEndereco(dominio);

    const profissional = await this.prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId: tenant.id, ativo: true },
      select: { id: true },
    });
    if (!profissional) throw new NotFoundException('Profissional não encontrado.');

    const casoDeUso = new ObterHorariosOcupados(this.agendamentos);
    const ocupados = await casoDeUso.executar(profissionalId, data, tenant.id);
    // Só as horas ocupadas — nenhum nome, nenhum telefone, nenhum id de
    // cliente. Quem quiser bisbilhotar a agenda descobre que às 15h tem
    // alguém, e nada além disso.
    return { ocupados };
  }

  async agendar(dominio: string, body: any, ip?: string, userAgent?: string) {
    const tenant = await this.barbeariaDoEndereco(dominio);
    if (!tenant.agendamentoSemConta) {
      throw new ForbiddenException(
        'Esta barbearia pede cadastro para agendar. Crie sua conta e marque por lá.',
      );
    }

    const nome = String(body?.nome ?? '').trim().replace(/\s+/g, ' ');
    if (nome.length < 2 || nome.length > 120) {
      throw new BadRequestException('Escreva seu nome completo.');
    }

    const telefone = this.telefoneValido(body?.telefone);
    if (body?.aceitouTermos !== true) {
      throw new BadRequestException(
        'É preciso aceitar os Termos de Uso e a Política de Privacidade para agendar.',
      );
    }
    if (!body?.data) throw new BadRequestException('Escolha o horário.');

    const cliente = await this.acharOuCriarCliente(tenant.id, nome, telefone, {
      ip,
      userAgent,
      aceitouLembretes: body?.aceitouLembretes === true,
    });

    const id = await this.agendamentos.salvar({
      data: new Date(body.data),
      tenantId: tenant.id,
      usuarioId: cliente.id,
      profissionalId: Number(body?.profissionalId),
      servicos: body?.servicos ?? body?.servicoIds,
      status: 'agendado',
      observacoes: body?.observacoes ? String(body.observacoes).trim() : undefined,
    } as any);

    this.notificacao.notificarNovoAgendamento(id).catch((erro) => {
      this.logger.error(
        `Falha ao avisar o cliente do agendamento público ${id}: ${erro?.message ?? erro}`,
      );
    });

    const agendamento = await this.agendamentos.buscarPorId(id, tenant.id);
    return this.soODaPessoa(agendamento);
  }

  /**
   * Reaproveita a conta do telefone, ou cria uma sem senha.
   *
   * Reaproveitar importa: sem isso, o mesmo cliente vira cinco contas e o
   * histórico dele — que é o que faz a barbearia lembrar como ele gosta do
   * corte — fica picado em cinco pedaços.
   */
  private async acharOuCriarCliente(
    tenantId: number,
    nome: string,
    telefone: string,
    contexto: { ip?: string; userAgent?: string; aceitouLembretes: boolean },
  ): Promise<{ id: number }> {
    // A base tem os dois formatos: uns cadastros gravaram `5511964891128`
    // (com o DDI, como a Evolution manda) e outros `11964891128`. Procurando
    // só pelo formato normalizado, o cliente antigo virava conta nova — e
    // depois não achava o próprio agendamento ao entrar na conta de verdade.
    const existente = await this.prisma.usuario.findFirst({
      where: {
        tenantId,
        ativo: true,
        OR: [{ telefone }, { telefone: `55${telefone}` }],
      },
      select: { id: true, semCadastro: true },
    });

    if (existente) {
      // O nome NÃO é sobrescrito: quem sabe o telefone de alguém poderia
      // renomear a conta dessa pessoa. O que a barbearia vê é o nome que a
      // própria pessoa cadastrou.
      return { id: existente.id };
    }

    const criado = await this.prisma.usuario.create({
      data: {
        nome,
        // E-mail sintético e único: a coluna é obrigatória e tem unicidade
        // por barbearia. `.invalido` é um TLD reservado justamente para não
        // existir — nenhuma mensagem sai por engano para este endereço.
        email: `${telefone}@sem-cadastro.invalido`,
        telefone,
        // Ninguém conhece esta senha, nem nós. Ela existe só para a coluna
        // não ficar vazia; entrar exige o link de primeiro acesso.
        senha: randomBytes(32).toString('hex'),
        tenantId,
        semCadastro: true,
      },
      select: { id: true },
    });

    await this.lgpd
      .registrar(
        { titularTipo: 'usuario', titularId: criado.id, tenantId },
        [
          { tipo: 'termos_de_uso', aceito: true, versao: VERSAO_TERMOS },
          { tipo: 'politica_privacidade', aceito: true, versao: VERSAO_PRIVACIDADE },
          {
            tipo: 'comunicacoes_whatsapp',
            aceito: contexto.aceitouLembretes,
            versao: VERSAO_PRIVACIDADE,
          },
        ],
        { ip: contexto.ip, userAgent: contexto.userAgent ?? 'Agendamento sem cadastro' },
      )
      .catch((erro) =>
        this.logger.error(
          `Falha ao registrar o aceite do cliente ${criado.id}: ${erro?.message ?? erro}`,
        ),
      );

    return { id: criado.id };
  }

  /**
   * O recibo que volta para quem acabou de marcar.
   *
   * Montado campo a campo de propósito. Devolver o objeto inteiro do
   * repositório mandaria junto o id e o e-mail do usuário, e um dia mandaria
   * também qualquer campo novo que alguém acrescentasse sem pensar nesta
   * rota.
   */
  private soODaPessoa(agendamento: any) {
    return {
      id: agendamento.id,
      data: agendamento.data,
      status: agendamento.status,
      profissional: agendamento.profissional?.nome ?? null,
      servicos: (agendamento.servicos ?? []).map((s: any) => ({
        nome: s.nome,
        preco: s.preco,
      })),
      valorTotal: agendamento.valorTotal,
      sinal:
        agendamento.sinalValor && agendamento.sinalStatus === 'pendente'
          ? {
              valor: agendamento.sinalValor,
              pixCopiaECola: agendamento.sinalPixCopiaECola,
              expiraEm: agendamento.sinalExpiraEm,
            }
          : null,
    };
  }

  /** Celular brasileiro, só dígitos, como o resto do sistema guarda. */
  private telefoneValido(bruto: unknown): string {
    const digitos = String(bruto ?? '').replace(/\D/g, '');
    const semPais = digitos.startsWith('55') && digitos.length > 11
      ? digitos.slice(2)
      : digitos;

    if (semPais.length < 10 || semPais.length > 11) {
      throw new BadRequestException('Informe um WhatsApp válido, com DDD.');
    }
    return semPais;
  }
}
