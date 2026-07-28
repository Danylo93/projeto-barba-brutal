import { Module } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { LgpdController } from './lgpd.controller';
import { LgpdService } from './lgpd.service';

@Module({
  controllers: [LgpdController],
  providers: [LgpdService, PrismaService],
  exports: [LgpdService],
})
export class LgpdModule {}
