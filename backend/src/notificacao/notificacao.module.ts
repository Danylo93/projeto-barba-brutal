import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { NotificacaoService } from './notificacao.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DbModule, WhatsappModule],
  providers: [NotificacaoService],
  exports: [NotificacaoService],
})
export class NotificacaoModule {}
