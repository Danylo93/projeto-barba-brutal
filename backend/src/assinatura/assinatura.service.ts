import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { mensagemPlanoContratado } from '../whatsapp/mensagens';

@Injectable()
export class AssinaturaService {
  private readonly logger = new Logger(AssinaturaService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
  ) {}

  async cancelSubscription(tenantId: number) {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
    });

    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada');
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
      const criada = await this.prisma.assinatura.upsert({
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

      await this.avisarNoWhatsapp(tenantId, plano, dataFim, true);
      return criada;
    }

    // Já tem plano vigente (teste ou pago) → só troca o plano, mantém a validade.
    const trocada = await this.prisma.assinatura.update({
      where: { tenantId },
      data: { planoId },
      include: { plano: true },
    });

    await this.avisarNoWhatsapp(
      tenantId,
      plano,
      trocada.dataFim,
      trocada.status === 'trialing',
    );
    return trocada;
  }

  /**
   * Manda no WhatsApp do dono o plano que ele acabou de fechar.
   *
   * Nunca propaga erro: se a mensagem falhar, o barbeiro já tem o plano e não
   * pode ver a contratação quebrar por causa de um envio.
   */
  private async avisarNoWhatsapp(
    tenantId: number,
    plano: { nome: string; preco: number },
    fimDoTeste: Date,
    emTeste: boolean,
  ) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { nome: true, telefone: true },
      });
      if (!tenant?.telefone) return;

      await this.whatsapp.enviarTexto(
        tenant.telefone,
        mensagemPlanoContratado({
          nomeBarbearia: tenant.nome,
          nomePlano: plano.nome,
          preco: plano.preco,
          fimDoTeste,
          emTeste,
        }),
      );
    } catch (erro) {
      this.logger.error(
        `Falha ao avisar o plano no WhatsApp (tenant ${tenantId}): ${
          erro instanceof Error ? erro.message : erro
        }`,
      );
    }
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

    // O barbeiro pagou e merece a confirmação no celular, não só na tela.
    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
      select: { nome: true, preco: true },
    });
    if (plano) await this.avisarNoWhatsapp(tenantId, plano, dataFim, false);
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

}
