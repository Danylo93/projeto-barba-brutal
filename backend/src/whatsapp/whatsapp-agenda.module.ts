import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { WhatsappModule } from './whatsapp.module';
import { WhatsappAgendaController } from './whatsapp-agenda.controller';
import { WhatsappAgendaService } from './whatsapp-agenda.service';
import { AuthModule } from '../auth/auth.module';
import { LgpdModule } from '../lgpd/lgpd.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';

@Module({
  imports: [
    DbModule,
    AgendamentoModule,
    WhatsappModule,
    AuthModule,
    LgpdModule,
    NotificacaoModule,
  ],
  controllers: [WhatsappAgendaController],
  providers: [WhatsappAgendaService],
})
export class WhatsappAgendaModule {}
