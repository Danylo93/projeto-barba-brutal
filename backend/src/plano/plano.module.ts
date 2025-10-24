import { Module } from '@nestjs/common';
import { PlanoController } from './plano.controller';
import { PlanoService } from './plano.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [PlanoController],
  providers: [PlanoService],
  exports: [PlanoService],
})
export class PlanoModule {}
