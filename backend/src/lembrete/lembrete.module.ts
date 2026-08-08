import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { SerieModule } from '../serie/serie.module';
import { LembreteController } from './lembrete.controller';
import { LembreteService } from './lembrete.service';

@Module({
  imports: [DbModule, WhatsappModule, AgendamentoModule, SerieModule],
  controllers: [LembreteController],
  providers: [LembreteService],
})
export class LembreteModule {}
