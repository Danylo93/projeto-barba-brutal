import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { WhatsappAgendaService } from './whatsapp-agenda.service';

/** API server-to-server usada exclusivamente pelas ferramentas do agente no n8n. */
@Controller('whatsapp/agenda')
export class WhatsappAgendaController {
  constructor(private readonly service: WhatsappAgendaService) {}

  @Get('catalogo')
  catalogo(@Headers('x-whatsapp-token') token: string, @Query('tenantId') tenantId: string) {
    return this.service.catalogo(token, tenantId);
  }

  @Get('agendamentos')
  listar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Query('telefone') telefone: string,
  ) {
    return this.service.listar(token, tenantId, telefone);
  }

  @Post('agendamentos')
  criar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.service.criar(token, tenantId, body);
  }

  @Post('agendamentos/:id/cancelar')
  cancelar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('telefone') telefone: string,
  ) {
    return this.service.cancelar(token, tenantId, id, telefone);
  }

  @Patch('agendamentos/:id/reagendar')
  reagendar(
    @Headers('x-whatsapp-token') token: string,
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { telefone?: string; data?: string },
  ) {
    return this.service.reagendar(token, tenantId, id, body);
  }
}
