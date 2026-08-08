import { Module } from '@nestjs/common';
import { SerieController } from './serie.controller';
import { SerieService } from './serie.service';
import { DbModule } from '../db/db.module';
import { AgendamentoModule } from '../agendamento/agendamento.module';

@Module({
  imports: [DbModule, AgendamentoModule],
  controllers: [SerieController],
  providers: [SerieService],
  exports: [SerieService],
})
export class SerieModule {}
