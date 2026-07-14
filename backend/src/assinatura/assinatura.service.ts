import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  private async createOrGetProduct(plano: any): Promise<string> {
    // Buscar produto existente
    const products = await this.stripe.products.list({
      limit: 100,
    });
    
    const existingProduct = products.data.find(p => p.name === plano.nome);
    if (existingProduct) {
      return existingProduct.id;
    }
    
    // Criar novo produto
    const product = await this.stripe.products.create({
      name: plano.nome,
      description: plano.descricao,
    });
    
    return product.id;
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
          product: await this.createOrGetProduct(plano),
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

    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    // Cancelar no Stripe quando houver subscription vinculada (best effort:
    // assinaturas criadas manualmente/seed não têm stripeSubscriptionId).
    if (assinatura.stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.cancel(assinatura.stripeSubscriptionId);
      } catch (err) {
        console.error('Falha ao cancelar no Stripe (seguindo com cancelamento local):', err?.message);
      }
    }

    // Atualizar no banco
    return this.prisma.assinatura.update({
      where: { tenantId },
      data: {
        status: 'canceled',
        renovacaoAutomatica: false,
      },
    });
  }

  /**
   * Troca/adesão de plano feita pelo próprio tenant (barbeiro-admin).
   * Ao adquirir um plano sem assinatura ativa, inicia um TESTE de 30 dias
   * (status "trialing"). A cobrança (Pix) converte para "active".
   */
  async changePlan(tenantId: number, planoId: number) {
    const plano = await this.prisma.plano.findUnique({ where: { id: planoId } });
    if (!plano || !plano.ativo) {
      throw new NotFoundException('Plano não encontrado ou inativo');
    }

    const assinatura = await this.prisma.assinatura.findUnique({ where: { tenantId } });
    const agora = new Date();
    const emVigor =
      assinatura &&
      (assinatura.status === 'active' || assinatura.status === 'trialing') &&
      assinatura.dataFim > agora;

    // Sem assinatura vigente → inicia teste de 30 dias.
    if (!emVigor) {
      const dataFim = new Date();
      dataFim.setDate(dataFim.getDate() + 30);
      return this.prisma.assinatura.upsert({
        where: { tenantId },
        create: {
          tenantId,
          planoId,
          status: 'trialing',
          emTeste: true,
          dataInicio: agora,
          dataFim,
          renovacaoAutomatica: true,
        },
        update: {
          planoId,
          status: 'trialing',
          emTeste: true,
          dataInicio: agora,
          dataFim,
          renovacaoAutomatica: true,
        },
        include: { plano: true },
      });
    }

    // Já tem plano vigente (teste ou pago) → só troca o plano, mantém a validade.
    return this.prisma.assinatura.update({
      where: { tenantId },
      data: { planoId },
      include: { plano: true },
    });
  }

  // ─────────────────────────── Pix (Mercado Pago) ───────────────────────────

  private get mpToken(): string | undefined {
    return process.env.MERCADO_PAGO_ACCESS_TOKEN;
  }

  private async mpFetch(path: string, init?: RequestInit) {
    const resp = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.mpToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new BadRequestException(
        (data as any)?.message || 'Erro ao comunicar com o Mercado Pago',
      );
    }
    return data as any;
  }

  /**
   * Cria uma cobrança Pix para o plano informado (ou o plano atual da assinatura).
   * Retorna o QR Code (imagem + copia-e-cola) para o barbeiro pagar.
   */
  async criarPagamentoPix(tenantId: number, planoId?: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { assinatura: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const idPlano = planoId ?? tenant.assinatura?.planoId;
    if (!idPlano) throw new BadRequestException('Nenhum plano selecionado');

    const plano = await this.prisma.plano.findUnique({ where: { id: idPlano } });
    if (!plano || !plano.ativo) throw new NotFoundException('Plano não encontrado ou inativo');

    if (!this.mpToken) {
      throw new BadRequestException(
        'Pagamento Pix indisponível: configure MERCADO_PAGO_ACCESS_TOKEN no servidor.',
      );
    }

    const mp = await this.mpFetch('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `${tenantId}-${idPlano}-${Date.now()}` },
      body: JSON.stringify({
        transaction_amount: Number(plano.preco.toFixed(2)),
        description: `Barba Brutal - Plano ${plano.nome}`,
        payment_method_id: 'pix',
        payer: { email: tenant.email, first_name: tenant.nome },
        metadata: { tenantId, planoId: idPlano },
      }),
    });

    const td = mp?.point_of_interaction?.transaction_data ?? {};
    const pagamento = await this.prisma.pagamento.create({
      data: {
        tenantId,
        planoId: idPlano,
        valor: plano.preco,
        metodo: 'pix',
        status: mp.status || 'pending',
        mpPaymentId: String(mp.id),
        qrCode: td.qr_code || null,
      },
    });

    return {
      pagamentoId: pagamento.id,
      status: pagamento.status,
      valor: plano.preco,
      plano: plano.nome,
      qrCode: td.qr_code || null, // copia e cola
      qrCodeBase64: td.qr_code_base64 || null, // imagem PNG base64
      ticketUrl: td.ticket_url || null,
    };
  }

  /**
   * Consulta o status de um pagamento; se aprovado, ativa a assinatura.
   */
  async consultarPagamento(tenantId: number, pagamentoId: number) {
    const pagamento = await this.prisma.pagamento.findFirst({
      where: { id: pagamentoId, tenantId },
    });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado');

    if (pagamento.status === 'pending' && pagamento.mpPaymentId && this.mpToken) {
      try {
        const mp = await this.mpFetch(`/v1/payments/${pagamento.mpPaymentId}`);
        if (mp.status && mp.status !== pagamento.status) {
          await this.prisma.pagamento.update({
            where: { id: pagamento.id },
            data: { status: mp.status },
          });
          pagamento.status = mp.status;
        }
      } catch {
        /* mantém status atual em caso de falha de rede */
      }
    }

    if (pagamento.status === 'approved') {
      await this.ativarAssinaturaPaga(pagamento.tenantId, pagamento.planoId);
    }

    return { pagamentoId: pagamento.id, status: pagamento.status };
  }

  /** Ativa (ou renova) a assinatura como PAGA por 30 dias. */
  private async ativarAssinaturaPaga(tenantId: number, planoId: number) {
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 30);
    await this.prisma.assinatura.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planoId,
        status: 'active',
        emTeste: false,
        dataInicio,
        dataFim,
        renovacaoAutomatica: true,
      },
      update: {
        planoId,
        status: 'active',
        emTeste: false,
        dataInicio,
        dataFim,
      },
    });
  }

  /** Webhook do Mercado Pago: confirma pagamentos aprovados. */
  async handleWebhookMercadoPago(body: any) {
    const paymentId = body?.data?.id || body?.id;
    if (!paymentId || !this.mpToken) return { ok: true };
    try {
      const mp = await this.mpFetch(`/v1/payments/${paymentId}`);
      const pagamento = await this.prisma.pagamento.findUnique({
        where: { mpPaymentId: String(paymentId) },
      });
      if (pagamento && mp.status) {
        await this.prisma.pagamento.update({
          where: { id: pagamento.id },
          data: { status: mp.status },
        });
        if (mp.status === 'approved') {
          await this.ativarAssinaturaPaga(pagamento.tenantId, pagamento.planoId);
        }
      }
    } catch (e) {
      console.error('Webhook MP falhou:', (e as any)?.message);
    }
    return { ok: true };
  }

  /** Confirmação manual pelo admin (controle do dono do SaaS). */
  async confirmarPagamentoManual(pagamentoId: number) {
    const pagamento = await this.prisma.pagamento.findUnique({ where: { id: pagamentoId } });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
    await this.prisma.pagamento.update({
      where: { id: pagamentoId },
      data: { status: 'approved' },
    });
    await this.ativarAssinaturaPaga(pagamento.tenantId, pagamento.planoId);
    return { ok: true, status: 'approved' };
  }

  /** Lista de pagamentos (admin). */
  async listarPagamentos() {
    const pagamentos = await this.prisma.pagamento.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { nome: true, email: true } }, plano: { select: { nome: true } } },
      take: 100,
    });
    return pagamentos.map((p) => ({
      id: p.id,
      valor: p.valor,
      status: p.status,
      metodo: p.metodo,
      barbearia: p.tenant?.nome,
      email: p.tenant?.email,
      plano: p.plano?.nome,
      createdAt: p.createdAt,
    }));
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
