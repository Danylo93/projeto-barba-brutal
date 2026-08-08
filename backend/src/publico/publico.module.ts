import { Module } from '@nestjs/common';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';
import { DbModule } from '../db/db.module';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { LgpdModule } from '../lgpd/lgpd.module';

@Module({
  imports: [DbModule, AgendamentoModule, NotificacaoModule, LgpdModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
