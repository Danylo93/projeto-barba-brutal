import {
  Body,
  Controller,
  Get,
  Ip,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicoService } from './publico.service';

/**
 * As rotas que a página da barbearia usa SEM login.
 *
 * Ficam num controller próprio, e não misturadas com as autenticadas, para
 * que a ausência de guard seja uma decisão visível: qualquer rota que entrar
 * aqui está aberta para a internet, e quem revisar vê isso no primeiro
 * arquivo em vez de descobrir num decorador esquecido lá embaixo.
 */
@Controller('publico')
export class PublicoController {
  constructor(private readonly publico: PublicoService) {}

  /** Horas ocupadas de um profissional num dia. Devolve só horários. */
  @Get(':dominio/horarios/:profissionalId/:data')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  horarios(
    @Param('dominio') dominio: string,
    @Param('profissionalId', ParseIntPipe) profissionalId: number,
    @Param('data') data: string,
  ) {
    return this.publico.horariosOcupados(dominio, profissionalId, data);
  }

  /**
   * Marca o horário só com nome e WhatsApp.
   *
   * O limite é apertado de propósito — 5 por minuto por IP. Agendar é ação
   * rara para uma pessoa e barata para um robô; sem teto, esta rota vira o
   * jeito mais fácil de encher a agenda de uma barbearia de horário falso.
   */
  @Post(':dominio/agendamentos')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  agendar(
    @Param('dominio') dominio: string,
    @Body() body: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.publico.agendar(dominio, body, ip, userAgent);
  }
}
