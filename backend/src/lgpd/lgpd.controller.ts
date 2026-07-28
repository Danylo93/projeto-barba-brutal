import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { LgpdService, RegistroDeConsentimento } from './lgpd.service';
import { VERSAO_COOKIES, VERSAO_PRIVACIDADE, VERSAO_TERMOS } from './versoes';

/** Extrai o IP real: no Render a aplicação fica atrás de proxy. */
function ipDaRequisicao(req: any): string | null {
  const encaminhado = req?.headers?.['x-forwarded-for'];
  if (typeof encaminhado === 'string' && encaminhado.length) {
    return encaminhado.split(',')[0].trim();
  }
  return req?.ip ?? null;
}

@Controller('lgpd')
export class LgpdController {
  constructor(private readonly service: LgpdService) {}

  /** Versões vigentes — o front usa para saber se precisa pedir aceite de novo. */
  @Get('versoes')
  versoes() {
    return {
      termos: VERSAO_TERMOS,
      privacidade: VERSAO_PRIVACIDADE,
      cookies: VERSAO_COOKIES,
    };
  }

  /**
   * Registra o consentimento. Aberto de propósito: o banner aparece antes de
   * qualquer login, e a LGPD exige a prova justamente desse momento. Se
   * houver token válido, o consentimento é amarrado ao titular.
   */
  @Post('consentimento')
  @UseGuards(OptionalJwtAuthGuard)
  registrar(
    @Req() req: any,
    @CurrentUser() user: any,
    @Body()
    body: {
      visitanteId?: string;
      tenantId?: number;
      consentimentos: RegistroDeConsentimento[];
    },
  ) {
    const titular = user
      ? {
          titularTipo: (user.tipo === 'tenant' ? 'tenant' : 'usuario') as 'tenant' | 'usuario',
          titularId: user.id,
          tenantId: user.tipo === 'tenant' ? user.id : user.tenantId,
          visitanteId: body?.visitanteId ?? null,
        }
      : {
          titularTipo: 'visitante' as const,
          titularId: null,
          tenantId: body?.tenantId ?? null,
          visitanteId: body?.visitanteId ?? null,
        };

    return this.service.registrar(titular, body?.consentimentos, {
      ip: ipDaRequisicao(req),
      userAgent: req?.headers?.['user-agent'] ?? null,
    });
  }

  @Get('meus-consentimentos')
  @UseGuards(JwtAuthGuard)
  meusConsentimentos(@CurrentUser() user: any) {
    return this.service.listarConsentimentos(
      user.tipo === 'tenant' ? 'tenant' : 'usuario',
      user.id,
    );
  }

  /** Portabilidade: devolve tudo que guardamos sobre quem está pedindo. */
  @Get('meus-dados')
  @UseGuards(JwtAuthGuard)
  meusDados(@CurrentUser() user: any) {
    return user.tipo === 'tenant'
      ? this.service.exportarDadosDoTenant(user.id)
      : this.service.exportarDadosDoUsuario(user.id, user.tenantId);
  }

  @Post('excluir-conta')
  @UseGuards(JwtAuthGuard)
  excluirConta(@CurrentUser() user: any, @Body() body: { motivo?: string }) {
    return this.service.solicitarExclusao(
      {
        titularTipo: user.tipo === 'tenant' ? 'tenant' : 'usuario',
        titularId: user.id,
        tenantId: user.tipo === 'tenant' ? user.id : user.tenantId,
        email: user.email,
      },
      body?.motivo,
    );
  }

  /* --------- visão da barbearia, que é controladora dos clientes --------- */

  @Get('solicitacoes-exclusao')
  @UseGuards(JwtAuthGuard)
  solicitacoes(@CurrentUser() user: any, @Query('status') status?: string) {
    if (user.tipo !== 'tenant') {
      throw new ForbiddenException(
        'Apenas a barbearia pode ver os pedidos dos seus clientes.',
      );
    }
    return this.service.listarSolicitacoes(user.id, status);
  }

  @Post('solicitacoes-exclusao/:id/concluir')
  @UseGuards(JwtAuthGuard)
  concluir(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    if (user.tipo !== 'tenant') {
      throw new ForbiddenException(
        'Apenas a barbearia pode atender o pedido dos seus clientes.',
      );
    }
    return this.service.concluirExclusao(user.id, id);
  }
}
