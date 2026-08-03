import { Module } from '@nestjs/common';
import { ProfissionalController } from './profissional.controller';
import { PrecosProfissionalService } from './precos.service';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ProfissionalController],
  providers: [PrecosProfissionalService],
})
export class ProfissionalModule {}

