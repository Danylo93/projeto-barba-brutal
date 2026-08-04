import { Module } from '@nestjs/common';
import { ProfissionalController } from './profissional.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ProfissionalController],
})
export class ProfissionalModule {}

