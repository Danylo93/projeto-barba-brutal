import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProdutoService } from './produto.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { UsuarioLogado } from '../usuario/usuario.decorator';
import { Usuario } from '../types';

/**
 * Produtos e estoque.
 *
 * Quem escreve é o dono ou o barbeiro — o barbeiro é quem está no balcão na
 * hora da venda, e obrigar a chamar o dono para dar baixa é o jeito mais
 * rápido de o estoque nunca bater. Cliente não enxerga nada disto.
 */
@Controller('produtos')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ProdutoController {
  constructor(private readonly produtos: ProdutoService) {}

  @Get()
  listar(
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
    @Query('todos') todos?: string,
  ) {
    this.exigirEquipe(usuario);
    return this.produtos.listar(tenantId, todos === 'true');
  }

  @Get('resumo')
  resumo(@CurrentTenantId() tenantId: number, @UsuarioLogado() usuario: Usuario) {
    this.exigirDono(usuario);
    return this.produtos.resumo(tenantId);
  }

  @Get('movimentos')
  historico(
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
    @Query('produtoId') produtoId?: string,
    @Query('limite') limite?: string,
  ) {
    this.exigirEquipe(usuario);
    return this.produtos.historico(
      tenantId,
      produtoId ? Number(produtoId) : undefined,
      limite ? Number(limite) : 100,
    );
  }

  @Get(':id')
  buscar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
  ) {
    this.exigirEquipe(usuario);
    return this.produtos.buscar(tenantId, id);
  }

  @Post()
  criar(
    @Body() body: any,
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
  ) {
    this.exigirDono(usuario);
    return this.produtos.criar(tenantId, body);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
  ) {
    this.exigirDono(usuario);
    return this.produtos.atualizar(tenantId, id, body);
  }

  @Delete(':id')
  desativar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
  ) {
    this.exigirDono(usuario);
    return this.produtos.desativar(tenantId, id);
  }

  /** Entrada, venda, saída ou ajuste. */
  @Post(':id/movimentos')
  movimentar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentTenantId() tenantId: number,
    @UsuarioLogado() usuario: Usuario,
  ) {
    this.exigirEquipe(usuario);
    return this.produtos.movimentar(tenantId, id, body, usuario?.id);
  }

  /** Dono e barbeiro. */
  private exigirEquipe(usuario: Usuario | any) {
    if (usuario?.tipo === 'tenant' || usuario?.barbeiro) return;
    throw new ForbiddenException('Só a equipe da barbearia acessa o estoque.');
  }

  /** Só o dono: preço de custo e cadastro são decisão de quem paga a conta. */
  private exigirDono(usuario: Usuario | any) {
    if (usuario?.tipo === 'tenant') return;
    throw new ForbiddenException('Só o dono da barbearia pode fazer isso.');
  }
}
