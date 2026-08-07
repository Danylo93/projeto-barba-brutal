import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DbModule } from '../db/db.module';
import { TenantModule } from '../tenant/tenant.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DbModule, TenantModule, WhatsappModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
