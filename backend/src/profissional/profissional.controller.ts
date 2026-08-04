import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { CurrentTenant, CurrentTenantId } from '../auth/current-tenant.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import * as bcrypt from 'bcrypt';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';
import { EMAIL_JA_USADO, normalizarEmail } from './acesso-profissional';

/** O preço é da barbearia: vem do próprio serviço, igual para todo mundo. */
const INCLUDE_SERVICOS = {
  servicos: {
    where: { ativo: true },
    select: { id: true, nome: true, preco: true },
  },
} as const;

@Controller('profissionais')
export class ProfissionalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentTenantId() tenantId: number) {
    return this.prisma.profissional.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: 'asc' },
      include: INCLUDE_SERVICOS,
    });
  }

  /**
   * Cadastro do barbeiro logado. Fica ANTES de `:id` de propósito: o Nest
   * casa as rotas na ordem de declaração, e `ParseIntPipe` derrubaria
   * "meu-cadastro" com 400 se `:id` viesse primeiro.
   */
  @Get('meu-cadastro')
  @UseGuards(JwtAuthGuard)
  async meuCadastro(@CurrentUser() usuario: any, @CurrentTenantId() tenantId: number) {
    const profissional = await this.prisma.profissional.findFirst({
      where: { usuarioId: usuario?.id, tenantId },
      include: INCLUDE_SERVICOS,
    });
    if (!profissional) {
      throw new NotFoundException(
        'Sua conta ainda não está vinculada a um profissional. Peça ao dono da barbearia.',
      );
    }
    return profissional;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
  ) {
    return this.prisma.profissional.findFirst({
      where: { id, tenantId },
      include: INCLUDE_SERVICOS,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async create(
    @Body() data: CreateProfissionalDto,
    @CurrentTenant() tenant: any,
  ) {
    // O e-mail é obrigatório (o DTO garante) e a conta de acesso é criada
    // sempre — sem ela o barbeiro nunca entra na própria agenda.
    const email = normalizarEmail(data.email);
    await this.garantirEmailLivre(email, tenant.id);

    const senhaHash = await bcrypt.hash(data.senha, 10);
    const user = await this.prisma.usuario.create({
      data: {
        nome: data.nome,
        email,
        senha: senhaHash,
        telefone: data.telefone || '',
        barbeiro: true,
        tenantId: tenant.id,
      },
    });
    const usuarioId = user.id;

    const servicoIds = await this.validarServicoIds(data.servicoIds, tenant.id);

    return this.prisma.profissional.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        // Profissional sem foto é normal; sem isto o cadastro dava 500.
        imagemUrl: data.imagemUrl || '',
        tenantId: tenant.id,
        usuarioId,
        avaliacao: data.avaliacao || 0,
        quantidadeAvaliacoes: data.quantidadeAvaliacoes || 0,
        comissaoPercent: data.comissaoPercent ?? 0,
        servicos: servicoIds.length
          ? { connect: servicoIds.map((id) => ({ id })) }
          : undefined,
      },
      include: INCLUDE_SERVICOS,
    });
  }

  /**
   * Recusa e-mail que já pertence a alguém desta barbearia.
   *
   * Sem esta checagem o Prisma batia no índice `@@unique([email, tenantId])`
   * e o dono recebia um 500 sem explicação. A comparação ignora a caixa: o
   * banco deixaria "Marcao@x.app" e "marcao@x.app" conviverem, mas é a mesma
   * caixa postal, e o barbeiro ficaria com duas contas.
   *
   * O escopo é a barbearia: o mesmo e-mail em OUTRA barbearia é legítimo — o
   * barbeiro que trabalha em duas usa o mesmo endereço nas duas.
   */
  private async garantirEmailLivre(
    email: string,
    tenantId: number,
    ignorarUsuarioId?: number | null,
  ): Promise<void> {
    const jaExiste = await this.prisma.usuario.findFirst({
      where: {
        tenantId,
        email: { equals: email, mode: 'insensitive' },
        ...(ignorarUsuarioId ? { id: { not: ignorarUsuarioId } } : {}),
      },
      select: { id: true },
    });

    if (jaExiste) {
      throw new BadRequestException(EMAIL_JA_USADO);
    }
  }

  /**
   * Mantém apenas os ids de serviço que pertencem ao próprio tenant,
   * evitando vincular serviços de outra barbearia.
   */
  private async validarServicoIds(
    servicoIds: number[] | undefined,
    tenantId: number,
  ): Promise<number[]> {
    if (!servicoIds || servicoIds.length === 0) return [];
    const servicos = await this.prisma.servico.findMany({
      where: { id: { in: servicoIds }, tenantId },
      select: { id: true },
    });
    return servicos.map((s) => s.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateProfissionalDto,
    @CurrentTenant() tenant: any,
  ) {
    const profissional = await this.prisma.profissional.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    let usuarioId = profissional.usuarioId;

    if (data.email) {
      const email = normalizarEmail(data.email);
      // Ignora a própria conta: salvar sem mexer no e-mail não pode dar
      // "e-mail já usado" por causa do próprio registro.
      await this.garantirEmailLivre(email, tenant.id, usuarioId);

      if (!usuarioId) {
        // Profissional antigo, cadastrado quando o e-mail era opcional: para
        // ganhar acesso agora precisa de senha, senão a conta não nasce e o
        // dono acha que deu acesso sem ter dado.
        if (!data.senha) {
          throw new BadRequestException(
            'Para dar acesso a este profissional, informe também uma senha.',
          );
        }
        const senhaHash = await bcrypt.hash(data.senha, 10);
        const user = await this.prisma.usuario.create({
          data: {
            nome: data.nome || profissional.nome,
            email,
            senha: senhaHash,
            telefone: data.telefone || '',
            barbeiro: true,
            tenantId: tenant.id,
          },
        });
        usuarioId = user.id;
      } else {
        const updateData: any = {
          nome: data.nome || profissional.nome,
          email,
        };
        if (data.telefone) updateData.telefone = data.telefone;
        if (data.senha) {
          updateData.senha = await bcrypt.hash(data.senha, 10);
        }
        await this.prisma.usuario.update({
          where: { id: usuarioId },
          data: updateData,
        });
      }
    }

    // `set` substitui totalmente o vínculo; só aplica quando o campo foi enviado.
    let servicosUpdate: any = undefined;
    if (data.servicoIds !== undefined) {
      const servicoIds = await this.validarServicoIds(data.servicoIds, tenant.id);
      servicosUpdate = { set: servicoIds.map((sid) => ({ id: sid })) };
    }

    return this.prisma.profissional.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        imagemUrl: data.imagemUrl,
        avaliacao: data.avaliacao,
        quantidadeAvaliacoes: data.quantidadeAvaliacoes,
        comissaoPercent: data.comissaoPercent,
        ativo: data.ativo,
        usuarioId,
        servicos: servicosUpdate,
      },
      include: INCLUDE_SERVICOS,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    return this.prisma.profissional.deleteMany({
      where: { id, tenantId: tenant.id },
    });
  }
}

