import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SchemaController } from './schema.controller';
import { SmtpController } from './smtp.controller';
import { DbModule } from '../db/db.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';

@Module({
  imports: [DbModule, NotificacaoModule],
  controllers: [HealthController, SchemaController, SmtpController],
})
export class HealthModule {}

