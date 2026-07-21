import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { LembreteController } from './lembrete.controller';
import { LembreteService } from './lembrete.service';

@Module({
  imports: [DbModule],
  controllers: [LembreteController],
  providers: [LembreteService],
})
export class LembreteModule {}
