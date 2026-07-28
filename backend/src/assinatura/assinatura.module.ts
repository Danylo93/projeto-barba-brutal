import { Module } from '@nestjs/common';
import { AssinaturaController } from './assinatura.controller';
import { AssinaturaService } from './assinatura.service';
import { DbModule } from '../db/db.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DbModule, WhatsappModule],
  controllers: [AssinaturaController],
  providers: [AssinaturaService],
  exports: [AssinaturaService],
})
export class AssinaturaModule {}
