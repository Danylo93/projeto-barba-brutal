import { Controller, Get, Post, Body, Param, ParseIntPipe, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { AssinaturaService } from './assinatura.service';
import Stripe from 'stripe';

@Controller('assinaturas')
export class AssinaturaController {
  constructor(private readonly assinaturaService: AssinaturaService) {}

  @Post('checkout')
  createCheckoutSession(
    @Body() data: {
      tenantId: number;
      planoId: number;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    return this.assinaturaService.createCheckoutSession(
      data.tenantId,
      data.planoId,
      data.successUrl,
      data.cancelUrl,
    );
  }

  @Post(':tenantId/subscribe')
  createSubscription(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() data: {
      planoId: number;
      paymentMethodId: string;
    },
  ) {
    return this.assinaturaService.createSubscription(
      tenantId,
      data.planoId,
      data.paymentMethodId,
    );
  }

  @Post(':tenantId/cancel')
  cancelSubscription(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.assinaturaService.cancelSubscription(tenantId);
  }

  @Get(':tenantId')
  getSubscription(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.assinaturaService.getSubscription(tenantId);
  }

  @Post('webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event: Stripe.Event;
    
    try {
      event = Stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        endpointSecret,
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return { error: 'Invalid signature' };
    }

    return this.assinaturaService.handleWebhook(event);
  }
}
