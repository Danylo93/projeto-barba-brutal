import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class AssinaturaService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    tenantId: number,
    planoId: number,
    successUrl: string,
    cancelUrl: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!tenant || !plano) {
      throw new Error('Tenant ou plano não encontrado');
    }

    // Criar ou buscar customer no Stripe
    let customerId = tenant.stripeCustomerId;
    
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: tenant.email,
        name: tenant.nome,
        metadata: {
          tenantId: tenant.id.toString(),
        },
      });
      customerId = customer.id;
      
      // Salvar customer ID no tenant
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Criar checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: plano.nome,
              description: plano.descricao,
            },
            unit_amount: Math.round(plano.preco * 100), // Converter para centavos
            recurring: {
              interval: plano.duracao === 30 ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: tenantId.toString(),
        planoId: planoId.toString(),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { sessionId: session.id };
  }

  async createSubscription(tenantId: number, planoId: number, paymentMethodId: string) {
    // Buscar tenant e plano
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { assinatura: true },
    });

    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!tenant || !plano) {
      throw new Error('Tenant ou plano não encontrado');
    }

    // Criar ou buscar customer no Stripe
    let customerId = tenant.assinatura?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: tenant.email,
        name: tenant.nome,
        metadata: {
          tenantId: tenant.id.toString(),
        },
      });
      customerId = customer.id;
    }

    // Criar subscription no Stripe
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: plano.nome,
            description: plano.descricao,
          },
          unit_amount: Math.round(plano.preco * 100), // Converter para centavos
          recurring: {
            interval: plano.duracao === 30 ? 'month' : 'year',
          },
        },
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Criar assinatura no banco
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + plano.duracao);

    const assinatura = await this.prisma.assinatura.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planoId,
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        dataInicio,
        dataFim,
      },
      update: {
        planoId,
        status: 'active',
        stripeSubscriptionId: subscription.id,
        dataInicio,
        dataFim,
      },
    });

    return {
      assinatura,
      subscription,
      clientSecret: (subscription.latest_invoice as any).payment_intent.client_secret,
    };
  }

  async cancelSubscription(tenantId: number) {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
    });

    if (!assinatura?.stripeSubscriptionId) {
      throw new Error('Assinatura não encontrada');
    }

    // Cancelar no Stripe
    await this.stripe.subscriptions.cancel(assinatura.stripeSubscriptionId);

    // Atualizar no banco
    return this.prisma.assinatura.update({
      where: { tenantId },
      data: {
        status: 'canceled',
      },
    });
  }

  async getSubscription(tenantId: number) {
    return this.prisma.assinatura.findUnique({
      where: { tenantId },
      include: {
        plano: true,
        tenant: true,
      },
    });
  }

  async updateSubscriptionStatus(stripeSubscriptionId: string, status: string) {
    return this.prisma.assinatura.update({
      where: { stripeSubscriptionId },
      data: { status },
    });
  }

  async createCheckoutSession(tenantId: number, planoId: number, successUrl: string, cancelUrl: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!tenant || !plano) {
      throw new Error('Tenant ou plano não encontrado');
    }

    const session = await this.stripe.checkout.sessions.create({
      customer_email: tenant.email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: plano.nome,
            description: plano.descricao,
          },
          unit_amount: Math.round(plano.preco * 100),
          recurring: {
            interval: plano.duracao === 30 ? 'month' : 'year',
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        tenantId: tenantId.toString(),
        planoId: planoId.toString(),
      },
    });

    return session;
  }

  async handleWebhook(event: any) {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const { tenantId, planoId } = session.metadata;
        
        if (session.payment_status === 'paid') {
          await this.createSubscriptionFromCheckout(
            parseInt(tenantId),
            parseInt(planoId),
            session.customer,
            session.subscription,
          );
        }
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.updateSubscriptionStatus(
          event.data.object.id,
          event.data.object.status,
        );
        break;
      case 'customer.subscription.deleted':
        await this.updateSubscriptionStatus(
          event.data.object.id,
          'canceled',
        );
        break;
      case 'invoice.payment_succeeded':
        // Renovar assinatura
        const subscription = await this.stripe.subscriptions.retrieve(
          event.data.object.subscription,
        );
        await this.updateSubscriptionStatus(
          subscription.id,
          subscription.status,
        );
        break;
      case 'invoice.payment_failed':
        await this.updateSubscriptionStatus(
          event.data.object.subscription,
          'past_due',
        );
        break;
    }
  }

  private async createSubscriptionFromCheckout(
    tenantId: number,
    planoId: number,
    customerId: string,
    subscriptionId: string,
  ) {
    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!plano) {
      throw new Error('Plano não encontrado');
    }

    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + plano.duracao);

    await this.prisma.assinatura.upsert({
      where: { tenantId },
      update: {
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        dataInicio,
        dataFim,
        renovacaoAutomatica: true,
      },
      create: {
        tenantId,
        planoId,
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        dataInicio,
        dataFim,
        renovacaoAutomatica: true,
      },
    });
  }
}
