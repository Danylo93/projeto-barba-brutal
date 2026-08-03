import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
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
import { SalvarPrecosDto } from './dto/salvar-precos.dto';
import { PrecosProfissionalService } from './precos.service';
import { tabelaDePrecos } from '../servico/preco';

/** Serviços do profissional já com o preço que ELE cobra. */
function comPrecoDoProfissional<
  T extends {
    servicos: { id: number; nome: string; preco: number }[];
    precos: { servicoId: number; preco: number }[];
  },
>(profissional: T) {
  const tabela = tabelaDePrecos(profissional.servicos, profissional.precos);
  const { precos, ...resto } = profissional;
  return {
    ...resto,
    servicos: profissional.servicos.map((servico) => ({
      id: servico.id,
      nome: servico.nome,
      preco: tabela.get(servico.id) ?? servico.preco,
      precoPadrao: servico.preco,
      personalizado: (tabela.get(servico.id) ?? servico.preco) !== servico.preco,
    })),
  };
}

const INCLUDE_SERVICOS = {
  servicos: {
    where: { ativo: true },
    select: { id: true, nome: true, preco: true },
  },
  precos: { select: { servicoId: true, preco: true } },
} as const;

@Controller('profissionais')
export class ProfissionalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precos: PrecosProfissionalService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentTenantId() tenantId: number) {
    const profissionais = await this.prisma.profissional.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: 'asc' },
      include: INCLUDE_SERVICOS,
    });
    return profissionais.map(comPrecoDoProfissional);
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
    return comPrecoDoProfissional(profissional);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
  ) {
    const profissional = await this.prisma.profissional.findFirst({
      where: { id, tenantId },
      include: INCLUDE_SERVICOS,
    });
    return profissional ? comPrecoDoProfissional(profissional) : null;
  }

  /**
   * Tabela de preços do profissional. Leitura liberada para quem está logado
   * na barbearia: o cliente precisa ver quanto o barbeiro escolhido cobra
   * antes de fechar o agendamento.
   */
  @Get(':id/precos')
  @UseGuards(JwtAuthGuard)
  async listarPrecos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
  ) {
    return this.precos.tabela(id, tenantId);
  }

  /** Dono da barbearia ou o próprio barbeiro — a checagem está no service. */
  @Put(':id/precos')
  @UseGuards(JwtAuthGuard)
  async salvarPrecos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dados: SalvarPrecosDto,
    @CurrentUser() usuario: any,
    @CurrentTenantId() tenantId: number,
  ) {
    await this.precos.garantirPermissaoDeEscrita(id, tenantId, usuario);
    return this.precos.salvar(id, tenantId, dados.precos);
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantAuthGuard)
  async create(
    @Body() data: CreateProfissionalDto,
    @CurrentTenant() tenant: any,
  ) {
    let usuarioId = null;

    if (data.email && data.senha) {
      const senhaHash = await bcrypt.hash(data.senha, 10);
      const user = await this.prisma.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha: senhaHash,
          telefone: data.telefone || '',
          barbeiro: true,
          tenantId: tenant.id,
        },
      });
      usuarioId = user.id;
    }

    const servicoIds = await this.validarServicoIds(data.servicoIds, tenant.id);

    const criado = await this.prisma.profissional.create({
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
    return comPrecoDoProfissional(criado);
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
      throw new Error('Profissional não encontrado');
    }

    let usuarioId = profissional.usuarioId;

    if (data.email) {
      if (!usuarioId) {
        if (data.senha) {
          const senhaHash = await bcrypt.hash(data.senha, 10);
          const user = await this.prisma.usuario.create({
            data: {
              nome: data.nome || profissional.nome,
              email: data.email,
              senha: senhaHash,
              telefone: data.telefone || '',
              barbeiro: true,
              tenantId: tenant.id,
            },
          });
          usuarioId = user.id;
        }
      } else {
        const updateData: any = {
          nome: data.nome || profissional.nome,
          email: data.email,
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

    const atualizado = await this.prisma.profissional.update({
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
    return comPrecoDoProfissional(atualizado);
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

