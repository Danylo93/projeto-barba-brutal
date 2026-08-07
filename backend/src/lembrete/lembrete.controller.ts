import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Headers,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { LembreteService } from './lembrete.service';

/**
 * Endpoints server-to-server dos avisos de WhatsApp (n8n + Evolution).
 *
 * Protegidos por `x-lembrete-token`, comparado com a env LEMBRETE_TOKEN. Sem a
 * env, ficam desativados — e não silenciosamente: respondem 503 dizendo o que
 * falta.
 *
 * O caminho normal é `POST .../disparar`: o n8n só dá a batida do relógio e o
 * backend busca, envia e marca. Os endpoints de leitura e de marcação
 * continuam existindo para quem precisa enviar por fora (Evolution que só
 * responde dentro da rede do n8n, por exemplo).
 */
@Controller('lembretes')
@SkipThrottle()
export class LembreteController {
  constructor(private readonly service: LembreteService) {}

  /** Confere o token e devolve o tenant opcional já validado. */
  private exigirToken(token: string, tenantId?: string): number | undefined {
    const esperado = process.env.LEMBRETE_TOKEN;
    if (!esperado) {
      throw new ServiceUnavailableException(
        'Lembretes desativados (defina LEMBRETE_TOKEN no backend).',
      );
    }
    if (!token || token !== esperado) {
      throw new UnauthorizedException('Token de lembrete inválido.');
    }

    const id = Number(tenantId);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  }

  // ─────────────────────────────── lembrete ───────────────────────────────

  /** Só lê: o que está pendente de lembrete, com as mensagens prontas. */
  @Get('proximos')
  async proximos(
    @Headers('x-lembrete-token') token: string,
    @Query('minutosAntes') minutosAntes?: string,
    @Query('janelaMin') janelaMin?: string,
    /** Opcional: recorta numa barbearia só, para quem roda o fluxo por conta. */
    @Query('tenantId') tenantId?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.proximos(
      Math.max(0, Number(minutosAntes) || 60),
      Math.max(1, Number(janelaMin) || 5),
      tenant,
    );
  }

  /** Busca, envia pela Evolution e marca — tudo num passo. */
  @Post('disparar')
  async disparar(
    @Headers('x-lembrete-token') token: string,
    @Query('minutosAntes') minutosAntes?: string,
    @Query('janelaMin') janelaMin?: string,
    @Query('tenantId') tenantId?: string,
    @Query('limite') limite?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.disparar('lembrete', {
      minutosAntes: Number(minutosAntes) || undefined,
      janelaMin: Number(janelaMin) || undefined,
      tenantId: tenant,
      limite: Number(limite) || undefined,
    });
  }

  /**
   * O fluxo avisa quais lembretes conseguiu enviar por fora.
   *
   * Substitui o dedup em Redis: sem marcar, o agendamento continua aparecendo
   * na próxima execução — que é exatamente o que salva a janela perdida.
   */
  @Post('enviados')
  async enviados(
    @Headers('x-lembrete-token') token: string,
    @Body() corpo: { ids?: number[] },
    @Query('tenantId') tenantId?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.marcar('lembrete', corpo?.ids ?? [], tenant);
  }

  // ───────────────────────────── confirmação ──────────────────────────────

  @Get('confirmacoes')
  async confirmacoes(
    @Headers('x-lembrete-token') token: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.confirmacoesPendentes(tenant);
  }

  @Post('confirmacoes/disparar')
  async dispararConfirmacoes(
    @Headers('x-lembrete-token') token: string,
    @Query('tenantId') tenantId?: string,
    @Query('limite') limite?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.disparar('confirmacao', {
      tenantId: tenant,
      limite: Number(limite) || undefined,
    });
  }

  @Post('confirmacoes/enviadas')
  async confirmacoesEnviadas(
    @Headers('x-lembrete-token') token: string,
    @Body() corpo: { ids?: number[] },
    @Query('tenantId') tenantId?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.marcar('confirmacao', corpo?.ids ?? [], tenant);
  }

  // ───────────────────────── lembrete de retorno ─────────────────────────

  /**
   * Rotina diária: procura serviços já realizados cujo prazo de retorno
   * venceu. Cada tenant usa os 15, 20, 30 ou 40 dias definidos no painel.
   */
  @Post('retorno/disparar')
  async dispararRetornos(
    @Headers('x-lembrete-token') token: string,
    @Query('tenantId') tenantId?: string,
    @Query('limite') limite?: string,
  ) {
    const tenant = this.exigirToken(token, tenantId);
    return this.service.dispararRetornos({
      tenantId: tenant,
      limite: Number(limite) || undefined,
    });
  }
}
