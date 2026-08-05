import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { WhatsappModule } from './whatsapp.module';
import { WhatsappAgendaController } from './whatsapp-agenda.controller';
import { WhatsappAgendaService } from './whatsapp-agenda.service';

@Module({
  imports: [DbModule, AgendamentoModule, WhatsappModule],
  controllers: [WhatsappAgendaController],
  providers: [WhatsappAgendaService],
})
export class WhatsappAgendaModule {}
