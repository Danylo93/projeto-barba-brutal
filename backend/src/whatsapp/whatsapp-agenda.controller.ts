import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { WhatsappAgendaService } from './whatsapp-agenda.service';

/** API server-to-server usada exclusivamente pelas ferramentas do agente no n8n. */
@Controller('whatsapp/agenda')
export class WhatsappAgendaController {
  constructor(private readonly service: WhatsappAgendaService) {}

  @Get('resolver')
  resolver(@Query('instance') instance: string) {
    return this.service.resolverPorInstance(instance);
  }

  @Get('catalogo')
  catalogo(@Headers('x-whatsapp-token') token: string, @Query('tenantId') tenantId: string, @Query('instance') instance: string) {
    return this.service.catalogo(token, tenantId, instance);
  }

  /**
   * Horários livres de um dia. `?data=2026-08-07&profissionalId=3&servicos=1,2`
   *
   * O robô precisa saber o que está livre para conversar como gente: sem isto
   * ele chuta um horário, toma recusa, e o cliente só ouve "não dá".
   */
  @Get('horarios')
  horarios(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Query('data') data: string,
    @Query('profissionalId') profissionalId: string,
    @Query('servicos') servicos: string,
    @Query('instance') instance: string,
  ) {
    return this.service.horarios(
      token,
      tenantId,
      { data, profissionalId, servicos },
      instance,
    );
  }

  @Get('agendamentos')
  listar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Query('telefone') telefone: string,
    @Query('instance') instance: string,
  ) {
    return this.service.listar(token, tenantId, telefone, instance);
  }

  @Post('agendamentos')
  criar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Body() body: any,
    @Query('instance') instance: string,
  ) {
    return this.service.criar(token, tenantId, body, instance);
  }

  @Post('agendamentos/:id/cancelar')
  cancelar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('telefone') telefone: string,
    @Query('instance') instance: string,
  ) {
    return this.service.cancelar(token, tenantId, id, telefone, instance);
  }

  @Patch('agendamentos/:id/reagendar')
  reagendar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { telefone?: string; data?: string },
    @Query('instance') instance: string,
  ) {
    return this.service.reagendar(token, tenantId, id, body, instance);
  }
}
