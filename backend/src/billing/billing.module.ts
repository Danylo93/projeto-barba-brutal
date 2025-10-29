import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [StripeWebhookController],
})
export class BillingModule {}

