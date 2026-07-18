import { Module } from '@nestjs/common';
import { AssinaturaController } from './assinatura.controller';
import { AssinaturaService } from './assinatura.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AssinaturaController],
  providers: [AssinaturaService],
  exports: [AssinaturaService],
})
export class AssinaturaModule {}
