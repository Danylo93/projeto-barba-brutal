import {
  Controller,
  Get,
  Query,
  Headers,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LembreteService } from './lembrete.service';

/**
 * Endpoint server-to-server para o n8n buscar os agendamentos que precisam de
 * lembrete. Protegido por um token no header `x-lembrete-token`, comparado com
 * a env LEMBRETE_TOKEN. Sem a env configurada, o endpoint fica desativado.
 */
@Controller('lembretes')
export class LembreteController {
  constructor(private readonly service: LembreteService) {}

  @Get('proximos')
  async proximos(
    @Headers('x-lembrete-token') token: string,
    @Query('minutosAntes') minutosAntes?: string,
    @Query('janelaMin') janelaMin?: string,
  ) {
    const esperado = process.env.LEMBRETE_TOKEN;
    if (!esperado) {
      throw new ServiceUnavailableException(
        'Lembretes desativados (defina LEMBRETE_TOKEN no backend).',
      );
    }
    if (!token || token !== esperado) {
      throw new UnauthorizedException('Token de lembrete inválido.');
    }

    const antes = Math.max(0, Number(minutosAntes) || 60);
    const janela = Math.max(1, Number(janelaMin) || 5);
    return this.service.proximos(antes, janela);
  }
}
