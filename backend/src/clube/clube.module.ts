import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { ClubeController } from './clube.controller';
import { ClubeService } from './clube.service';

@Module({
  imports: [DbModule],
  controllers: [ClubeController],
  providers: [ClubeService],
  exports: [ClubeService],
})
export class ClubeModule {}
