import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { BloqueioController } from './bloqueio.controller';
import { BloqueioService } from './bloqueio.service';

@Module({
  imports: [DbModule],
  controllers: [BloqueioController],
  providers: [BloqueioService],
  exports: [BloqueioService],
})
export class BloqueioModule {}
