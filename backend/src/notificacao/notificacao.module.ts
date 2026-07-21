import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { NotificacaoService } from './notificacao.service';

@Module({
  imports: [DbModule],
  providers: [NotificacaoService],
  exports: [NotificacaoService],
})
export class NotificacaoModule {}
