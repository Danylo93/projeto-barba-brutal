import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SchemaController } from './schema.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [HealthController, SchemaController],
})
export class HealthModule {}

