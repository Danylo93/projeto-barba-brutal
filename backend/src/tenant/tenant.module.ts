import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { DbModule } from '../db/db.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DbModule, WhatsappModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
