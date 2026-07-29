import { Module } from '@nestjs/common';
import { AssinaturaController } from './assinatura.controller';
import { AssinaturaService } from './assinatura.service';
import { DbModule } from '../db/db.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';

@Module({
  imports: [DbModule, WhatsappModule, NotificacaoModule],
  controllers: [AssinaturaController],
  providers: [AssinaturaService],
  exports: [AssinaturaService],
})
export class AssinaturaModule {}
