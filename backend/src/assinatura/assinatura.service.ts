import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  mensagemAvisoAssinatura,
  mensagemPlanoContratado,
  TipoAvisoAssinatura,
} from '../whatsapp/mensagens';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { emailAvisoAssinatura, emailPlanoContratado } from '../notificacao/templates';
import {
  corpoDaAssinatura,
  corpoDoPlano,
  interpretarNotificacao,
  lerReferenciaExterna,
  pagamentoRenovaPlano,
  traduzirStatus,
} from './mercadopago-assinatura';
import { dominioDaOpcao } from './dominio';
import { DIAS_TESTE_GRATIS } from './teste-gratis';

@Injectable()
export class AssinaturaService {
  private readonly logger = new Logger(AssinaturaService.name);
  private avisosEmAndamento = false;

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private notificacao: NotificacaoService,
  ) {}

  async cancelSubscription(tenantId: number) {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
    });

    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    // Para de cobrar no cartão: cancelar só localmente deixaria a fatura vindo.
    await this.cancelarRecorrenciaNoMp(assinatura.mpPreapprovalId);

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
   * Sem assinatura ativa e sem teste usado, inicia o TESTE grátis.
   * Com assinatura ativa, faz a troca do plano e calcula a diferença
   * proporcional do restante do ciclo para orientar a cobrança.
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
    const planoAtual = assinatura
      ? await this.prisma.plano.findUnique({ where: { id: assinatura.planoId } })
      : null;
    const eUpgrade = !!planoAtual && plano.preco > planoAtual.preco;
    const eDowngrade = !!planoAtual && plano.preco < planoAtual.preco;
    const diasRestantes = assinatura && assinatura.dataFim > agora
      ? Math.max(0, Math.ceil((assinatura.dataFim.getTime() - agora.getTime()) / 86400000))
      : 0;
    const diasNoCiclo = assinatura
      ? Math.max(
          1,
          Math.ceil((assinatura.dataFim.getTime() - assinatura.dataInicio.getTime()) / 86400000),
        )
      : 30;
    const proporcaoRestante = diasRestantes / diasNoCiclo;
    const diferencaProporcional =
      eUpgrade && planoAtual
        ? Number(Math.max(0, (plano.preco - planoAtual.preco) * proporcaoRestante).toFixed(2))
        : 0;

    // Teste grátis é UMA vez por barbearia, e a marca fica no tenant para
    // sobreviver a cancelamento. Sem isso bastava cancelar e escolher um
    // plano de novo para ganhar mais um teste — todo mês, de graça, e ainda
    // dava para pular do Básico para o Premium.
    const barbearia = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { testeGratisUsadoEm: true },
    });
    const jaUsouTeste = !!barbearia?.testeGratisUsadoEm;

    // Sem assinatura vigente e sem teste gasto → inicia o teste grátis.
    if (!emVigor && !jaUsouTeste) {
      const dataFim = new Date();
      dataFim.setDate(dataFim.getDate() + DIAS_TESTE_GRATIS);
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
          ...this.zerarAvisosDeValidade(),
        },
        include: { plano: true },
      });

      // Queima o teste: a partir daqui, escolher plano de novo não renova nada.
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { testeGratisUsadoEm: agora },
      });

      await this.avisarPlanoContratado(tenantId, plano, dataFim, true);
      return {
        assinatura: criada,
        tipoAlteracao: 'trial',
        valorProporcional: 0,
      };
    }

    // Já gastou o teste e não tem assinatura vigente: precisa pagar para voltar.
    if (!emVigor) {
      throw new BadRequestException(
        'Seu período de teste já foi usado. Escolha um plano e pague para reativar o acesso.',
      );
    }

    // Já tem plano vigente (teste ou pago) → troca o plano.
    const trocada = await this.prisma.assinatura.update({
      where: { tenantId },
      data: { planoId },
      include: { plano: true },
    });

    const ehTrial = trocada.status === 'trialing';
    const retornoValidoAte = ehTrial ? trocada.dataFim : trocada.dataFim;
    await this.avisarPlanoContratado(tenantId, plano, retornoValidoAte, ehTrial);
    return {
      assinatura: trocada,
      tipoAlteracao: eUpgrade ? 'upgrade' : eDowngrade ? 'downgrade' : 'troca',
      valorProporcional: diferencaProporcional,
      diasRestantes,
    };
  }

  /**
   * Avisa o dono do plano que ele acabou de fechar, no WhatsApp e por e-mail.
   *
   * Nunca propaga erro: se o aviso falhar, o barbeiro já tem o plano e não
   * pode ver a contratação quebrar por causa de um envio. Os dois canais são
   * independentes de propósito — Evolution fora do ar não pode impedir o
   * e-mail, que é o comprovante que fica (WhatsApp some no meio da conversa).
   */
  private async avisarPlanoContratado(
    tenantId: number,
    plano: { nome: string; preco: number },
    fimDoTeste: Date,
    emTeste: boolean,
  ) {
    const tenant = await this.prisma.tenant
      .findUnique({
        where: { id: tenantId },
        select: { nome: true, telefone: true, email: true },
      })
      .catch(() => null);
    if (!tenant) return;

    const registrarFalha = (canal: string) => (erro: unknown) =>
      this.logger.error(
        `Falha ao avisar o plano por ${canal} (tenant ${tenantId}): ${
          erro instanceof Error ? erro.message : erro
        }`,
      );

    const envios: Promise<unknown>[] = [];

    if (tenant.telefone) {
      envios.push(
        this.whatsapp
          .enviarTexto(
            tenant.telefone,
            mensagemPlanoContratado({
              nomeBarbearia: tenant.nome,
              nomePlano: plano.nome,
              preco: plano.preco,
              fimDoTeste,
              emTeste,
            }),
          )
          .catch(registrarFalha('WhatsApp')),
      );
    }

    // O e-mail vai em segundo plano: o barbeiro acabou de clicar em "contratar"
    // e não pode esperar o SMTP para ver o plano liberado.
    if (tenant.email) {
      this.notificacao.enviarTemplateEmSegundoPlano(
        tenant.email,
        emailPlanoContratado({
          nomeBarbearia: tenant.nome,
          nomePlano: plano.nome,
          preco: plano.preco,
          validoAte: fimDoTeste,
          emTeste,
          urlPainel: `${this.urlDoSite}/dashboard`,
        }),
      );
    }

    await Promise.all(envios);
  }

  private zerarAvisosDeValidade() {
    return {
      avisoVencimentoWhatsappEm: null,
      avisoVencimentoEmailEm: null,
      avisoExpiracaoWhatsappEm: null,
      avisoExpiracaoEmailEm: null,
    };
  }

  /**
   * Envia o aviso de véspera e o aviso de expiração pelos dois canais.
   *
   * Cada coluna é um comprovante independente. Só é preenchida depois de o
   * canal aceitar o envio; assim, uma pane no e-mail não repete o WhatsApp e a
   * próxima rodada ainda tenta apenas o que ficou faltando.
   */
  async dispararAvisosExpiracao(opcoes: { agora?: Date; limite?: number } = {}) {
    if (this.avisosEmAndamento) {
      return { ignorado: true, motivo: 'Já existe uma rodada em andamento.' };
    }

    this.avisosEmAndamento = true;
    const agora = opcoes.agora ?? new Date();
    const ateAmanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
    const limite = Math.min(500, Math.max(1, Number(opcoes.limite) || 200));
    const include = {
      tenant: {
        select: {
          nome: true,
          telefone: true,
          email: true,
          configuracoes: true,
        },
      },
      plano: { select: { nome: true } },
    } as const;
    const resumo = {
      consultadas: 0,
      whatsapp: { enviados: 0, falhas: 0, semDestino: 0 },
      email: { enviados: 0, falhas: 0, semDestino: 0, desativado: 0 },
    };

    try {
      const [vencendo, expiradas] = await Promise.all([
        this.prisma.assinatura.findMany({
          where: {
            status: { in: ['active', 'trialing'] },
            dataFim: { gt: agora, lte: ateAmanha },
            OR: [
              { avisoVencimentoWhatsappEm: null },
              { avisoVencimentoEmailEm: null },
            ],
          },
          include,
          orderBy: { dataFim: 'asc' },
          take: limite,
        }),
        this.prisma.assinatura.findMany({
          where: {
            status: { in: ['active', 'trialing'] },
            dataFim: { lte: agora },
            OR: [
              { avisoExpiracaoWhatsappEm: null },
              { avisoExpiracaoEmailEm: null },
            ],
          },
          include,
          orderBy: { dataFim: 'asc' },
          take: limite,
        }),
      ]);

      resumo.consultadas = vencendo.length + expiradas.length;
      for (const assinatura of vencendo) {
        await this.processarAvisoDeValidade(assinatura, 'vence_amanha', agora, resumo);
      }
      for (const assinatura of expiradas) {
        await this.processarAvisoDeValidade(assinatura, 'expirou', agora, resumo);
      }

      return { ignorado: false, ...resumo };
    } finally {
      this.avisosEmAndamento = false;
    }
  }

  private async processarAvisoDeValidade(
    assinatura: any,
    tipo: TipoAvisoAssinatura,
    enviadoEm: Date,
    resumo: {
      whatsapp: { enviados: number; falhas: number; semDestino: number };
      email: { enviados: number; falhas: number; semDestino: number; desativado: number };
    },
  ) {
    const emTeste = assinatura.status === 'trialing' || assinatura.emTeste === true;
    const dados = {
      nomeBarbearia: assinatura.tenant.nome,
      nomePlano: emTeste ? 'Premium' : assinatura.plano.nome,
      dataFim: assinatura.dataFim,
      emTeste,
      tipo,
      urlPlanos: `${this.urlDoSite}/planos`,
    };
    const config = (assinatura.tenant.configuracoes as Record<string, unknown> | null) ?? {};
    const instancia = String(config.evolutionInstance ?? '').trim() || undefined;
    const campoWhatsapp = tipo === 'expirou'
      ? 'avisoExpiracaoWhatsappEm'
      : 'avisoVencimentoWhatsappEm';
    const campoEmail = tipo === 'expirou'
      ? 'avisoExpiracaoEmailEm'
      : 'avisoVencimentoEmailEm';

    if (!assinatura[campoWhatsapp]) {
      if (!assinatura.tenant.telefone) {
        resumo.whatsapp.semDestino += 1;
      } else {
        const enviado = await this.whatsapp
          .enviarTexto(
            assinatura.tenant.telefone,
            mensagemAvisoAssinatura(dados),
            instancia,
          )
          .catch(() => false);
        if (enviado) {
          await this.marcarCanalDoAviso(assinatura.id, campoWhatsapp, enviadoEm);
          resumo.whatsapp.enviados += 1;
        } else {
          resumo.whatsapp.falhas += 1;
        }
      }
    }

    if (!assinatura[campoEmail]) {
      if (!assinatura.tenant.email) {
        resumo.email.semDestino += 1;
      } else if (!this.notificacao.emailAtivo) {
        resumo.email.desativado += 1;
      } else {
        try {
          await this.notificacao.enviarTemplate(
            assinatura.tenant.email,
            emailAvisoAssinatura({
              nomeBarbearia: dados.nomeBarbearia,
              nomePlano: dados.nomePlano,
              validoAte: dados.dataFim,
              emTeste: dados.emTeste,
              tipo: dados.tipo,
              urlPlanos: dados.urlPlanos,
            }),
          );
          await this.marcarCanalDoAviso(assinatura.id, campoEmail, enviadoEm);
          resumo.email.enviados += 1;
        } catch (erro) {
          resumo.email.falhas += 1;
          this.logger.error(
            `Falha no aviso de validade por e-mail (assinatura ${assinatura.id}): ${
              erro instanceof Error ? erro.message : erro
            }`,
          );
        }
      }
    }
  }

  private async marcarCanalDoAviso(id: number, campo: string, enviadoEm: Date) {
    await this.prisma.assinatura.update({
      where: { id },
      data: { [campo]: enviadoEm } as any,
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
   * Cria um Pix de upgrade usando o valor proporcional calculado pela troca.
   * Se o valor for zero ou inválido, volta para o preço cheio do plano.
   */
  async criarPixUpgrade(tenantId: number, planoId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { assinatura: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const plano = await this.prisma.plano.findUnique({ where: { id: planoId } });
    if (!plano || !plano.ativo) throw new NotFoundException('Plano não encontrado ou inativo');

    const assinatura = tenant.assinatura;
    const agora = new Date();
    const planoAtual = assinatura
      ? await this.prisma.plano.findUnique({ where: { id: assinatura.planoId } })
      : null;
    const diasRestantes = assinatura && assinatura.dataFim > agora
      ? Math.max(0, Math.ceil((assinatura.dataFim.getTime() - agora.getTime()) / 86400000))
      : 0;
    const diasNoCiclo = assinatura
      ? Math.max(
          1,
          Math.ceil((assinatura.dataFim.getTime() - assinatura.dataInicio.getTime()) / 86400000),
        )
      : 30;
    const proporcaoRestante = diasRestantes / diasNoCiclo;
    const valorBase = planoAtual ? Math.max(0, plano.preco - planoAtual.preco) : plano.preco;
    const valorCobranca = Number(Math.max(0.01, valorBase * proporcaoRestante || plano.preco).toFixed(2));

    if (!this.mpToken) {
      throw new BadRequestException(
        'Pagamento Pix indisponível: configure MERCADO_PAGO_ACCESS_TOKEN no servidor.',
      );
    }

    const mp = await this.mpFetch('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `upgrade-${tenantId}-${planoId}-${Date.now()}` },
      body: JSON.stringify({
        transaction_amount: valorCobranca,
        description: `Barba Brutal - Upgrade para ${plano.nome}`,
        payment_method_id: 'pix',
        payer: { email: tenant.email, first_name: tenant.nome },
        metadata: {
          tenantId,
          planoId,
          upgrade: true,
          valorBase,
          diasRestantes,
        },
      }),
    });

    const td = mp?.point_of_interaction?.transaction_data ?? {};
    const pagamento = await this.prisma.pagamento.create({
      data: {
        tenantId,
        planoId,
        valor: valorCobranca,
        metodo: 'pix_upgrade',
        status: mp.status || 'pending',
        mpPaymentId: String(mp.id),
        qrCode: td.qr_code || null,
      },
    });

    return {
      pagamentoId: pagamento.id,
      status: pagamento.status,
      valor: valorCobranca,
      plano: plano.nome,
      qrCode: td.qr_code || null,
      qrCodeBase64: td.qr_code_base64 || null,
      ticketUrl: td.ticket_url || null,
      tipoAlteracao: planoAtual && plano.preco > planoAtual.preco ? 'upgrade' : 'troca',
      valorBase,
      diasRestantes,
    };
  }

  /**
   * Cria uma cobrança Pix para o Adicional de Domínio Próprio.
   *
   * São dois serviços com preços diferentes: configurar um domínio que a
   * barbearia já tem (R$ 29,90) ou registrar um novo e configurar (R$ 69,90).
   * Nenhum dos dois liga sozinho — quem entrega é o suporte —, e a resposta
   * carrega isso para a tela dizer, em vez de deixar o dono esperando algo que
   * nunca ia acontecer.
   */
  async criarPagamentoPixDominio(tenantId: number, opcao: unknown) {
    const escolha = dominioDaOpcao(opcao);
    if (!escolha) {
      throw new BadRequestException(
        'Escolha se você já tem um domínio ou se quer que a gente registre um.',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { assinatura: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const idPlano = tenant.assinatura?.planoId;
    if (!idPlano) throw new BadRequestException('Você precisa de um plano para adicionar domínio.');

    if (!this.mpToken) {
      throw new BadRequestException(
        'Pagamento Pix indisponível: configure MERCADO_PAGO_ACCESS_TOKEN no servidor.',
      );
    }

    const mp = await this.mpFetch('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `dominio-${escolha.opcao}-${tenantId}-${Date.now()}` },
      body: JSON.stringify({
        transaction_amount: escolha.preco,
        description: `Barba Brutal - ${escolha.titulo}`,
        payment_method_id: 'pix',
        payer: { email: tenant.email, first_name: tenant.nome },
        metadata: { tenantId, dominio: true, opcaoDominio: escolha.opcao },
      }),
    });

    const td = mp?.point_of_interaction?.transaction_data ?? {};
    const pagamento = await this.prisma.pagamento.create({
      data: {
        tenantId,
        planoId: idPlano,
        valor: escolha.preco,
        // O prefixo `pix_dominio` é o que impede este pagamento de renovar o
        // plano de graça. A opção fica no sufixo para o suporte saber, na
        // lista de pagamentos, qual dos dois serviços foi comprado.
        metodo: escolha.metodo,
        status: mp.status || 'pending',
        mpPaymentId: String(mp.id),
        qrCode: td.qr_code || null,
      },
    });

    this.logger.log(
      `Domínio próprio (${escolha.opcao}) contratado pela barbearia #${tenantId} ` +
        `— pagamento #${pagamento.id}. Assim que aprovar, o suporte precisa entrar em contato.`,
    );

    return {
      pagamentoId: pagamento.id,
      status: pagamento.status,
      valor: escolha.preco,
      plano: escolha.titulo,
      opcaoDominio: escolha.opcao,
      resumoDominio: escolha.resumo,
      // A tela usa isto para não prometer nada automático.
      atendimentoManual: true,
      qrCode: td.qr_code || null,
      qrCodeBase64: td.qr_code_base64 || null,
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

    if (pagamento.status === 'approved' && pagamento.metodo === 'pix_upgrade') {
      await this.ativarUpgradePago(pagamento.tenantId, pagamento.planoId);
    } else if (pagamento.status === 'approved' && pagamentoRenovaPlano(pagamento)) {
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
        meioPagamento: 'pix_avulso',
      },
      update: {
        planoId,
        status: 'active',
        emTeste: false,
        dataInicio,
        dataFim,
        meioPagamento: 'pix_avulso',
        ...this.zerarAvisosDeValidade(),
      },
    });

    // O barbeiro pagou e merece a confirmação no celular, não só na tela.
    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
      select: { nome: true, preco: true },
    });
    if (plano) await this.avisarPlanoContratado(tenantId, plano, dataFim, false);
  }

  /** Atualiza o plano sem reiniciar o ciclo, usado para upgrade proporcional. */
  private async ativarUpgradePago(tenantId: number, planoId: number) {
    const assinatura = await this.prisma.assinatura.findUnique({ where: { tenantId } });
    if (!assinatura) {
      await this.ativarAssinaturaPaga(tenantId, planoId);
      return;
    }

    await this.prisma.assinatura.update({
      where: { tenantId },
      data: {
        planoId,
        status: assinatura.status === 'trialing' ? 'trialing' : 'active',
        emTeste: assinatura.status === 'trialing',
        renovacaoAutomatica: true,
        meioPagamento: 'pix_upgrade',
      },
    });

    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
      select: { nome: true, preco: true },
    });
    if (plano) {
      const fim = assinatura.dataFim ?? new Date();
      await this.avisarPlanoContratado(tenantId, plano, fim, assinatura.status === 'trialing');
    }
  }

  // ───────────────── Assinatura recorrente (cartão ou Pix) ─────────────────

  private get urlDoSite(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
  }

  /**
   * Garante que o plano existe como `preapproval_plan` no Mercado Pago.
   *
   * É idempotente: se já houver id salvo, atualiza o valor lá em vez de criar
   * outro — plano duplicado no MP vira cobrança duplicada no cartão de alguém.
   */
  async sincronizarPlanoNoMercadoPago(planoId: number) {
    const plano = await this.prisma.plano.findUnique({ where: { id: planoId } });
    if (!plano) throw new NotFoundException('Plano não encontrado');
    this.exigirToken();

    const corpo = corpoDoPlano(plano, `${this.urlDoSite}/assinatura`);

    if (plano.mpPreapprovalPlanId) {
      const atualizado = await this.mpFetch(
        `/preapproval_plan/${plano.mpPreapprovalPlanId}`,
        { method: 'PUT', body: JSON.stringify(corpo) },
      );
      await this.prisma.plano.update({
        where: { id: plano.id },
        data: { mpInitPoint: atualizado.init_point ?? plano.mpInitPoint },
      });
      return { id: plano.mpPreapprovalPlanId, atualizado: true };
    }

    const criado = await this.mpFetch('/preapproval_plan', {
      method: 'POST',
      body: JSON.stringify(corpo),
    });
    await this.prisma.plano.update({
      where: { id: plano.id },
      data: {
        mpPreapprovalPlanId: String(criado.id),
        mpInitPoint: criado.init_point ?? null,
      },
    });
    return { id: String(criado.id), atualizado: false };
  }

  /** Sincroniza todos os planos ativos de uma vez. */
  async sincronizarTodosOsPlanos() {
    const planos = await this.prisma.plano.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
    });
    const resultado: { plano: string; id?: string; erro?: string }[] = [];
    for (const p of planos) {
      try {
        const r = await this.sincronizarPlanoNoMercadoPago(p.id);
        resultado.push({ plano: p.nome, id: r.id });
      } catch (e) {
        resultado.push({
          plano: p.nome,
          erro: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return resultado;
  }

  /**
   * Diz se a credencial do Mercado Pago funciona, sem revelar o token.
   *
   * Existe porque errar a credencial é fácil demais: na tela do Mercado Pago
   * a Public Key aparece visível e o Access Token vem mascarado, então copiar
   * a de cima é o acidente natural. Os erros que voltam ("authorization value
   * not present") não dizem isso, e a pessoa fica adivinhando.
   */
  async diagnosticarMercadoPago() {
    const token = this.mpToken;
    if (!token?.trim()) {
      return {
        ok: false,
        problema: 'MERCADO_PAGO_ACCESS_TOKEN não está configurado no servidor.',
      };
    }

    // A Public Key é um UUID depois do prefixo; o Access Token é um número
    // longo seguido de data e hash. Dá para avisar antes mesmo de chamar a API.
    const pareceChavePublica = /^(TEST-|APP_USR-)?[0-9a-f]{8}-[0-9a-f]{4}-/i.test(token.trim());
    if (pareceChavePublica) {
      return {
        ok: false,
        problema:
          'O valor configurado tem cara de Public Key, não de Access Token. ' +
          'Na tela de credenciais do Mercado Pago, a Public Key fica visível e o ' +
          'Access Token vem mascarado — clique no olho e use o botão de copiar do Access Token.',
      };
    }
    if (token !== token.trim()) {
      return {
        ok: false,
        problema: 'O token tem espaço ou quebra de linha sobrando. Cole de novo, sem espaços.',
      };
    }

    try {
      const eu = await this.mpFetch('/users/me');
      return {
        ok: true,
        ambiente: token.startsWith('TEST-') ? 'teste' : 'produção',
        contaMercadoPago: eu?.nickname ?? eu?.id ?? null,
        pais: eu?.site_id ?? null,
      };
    } catch (e) {
      return {
        ok: false,
        problema:
          'O Mercado Pago recusou a credencial: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  private exigirToken() {
    if (!this.mpToken) {
      throw new BadRequestException(
        'Pagamento indisponível: configure MERCADO_PAGO_ACCESS_TOKEN no servidor.',
      );
    }
  }

  /**
   * Começa a assinatura recorrente e devolve o link do checkout do Mercado
   * Pago, onde o barbeiro escolhe cartão ou Pix.
   *
   * Não pedimos os dados do cartão nas nossas telas de propósito: além de
   * tirar o cartão do nosso servidor, é o que permite oferecer Pix — pelo
   * caminho do `card_token_id` só daria para cobrar no cartão.
   */
  async iniciarAssinaturaRecorrente(tenantId: number, planoId: number) {
    this.exigirToken();

    const [tenant, plano] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { email: true, nome: true },
      }),
      this.prisma.plano.findUnique({ where: { id: planoId } }),
    ]);
    if (!tenant) throw new NotFoundException('Barbearia não encontrada');
    if (!plano || !plano.ativo) {
      throw new NotFoundException('Plano não encontrado ou inativo');
    }

    // A primeira cobrança cai só quando o teste grátis termina. Se a
    // barbearia já está em teste, respeita a data que ela já tem.
    const assinaturaAtual = await this.prisma.assinatura.findUnique({
      where: { tenantId },
      select: { dataFim: true, emTeste: true },
    });
    const daquiATrintaDias = new Date();
    daquiATrintaDias.setDate(daquiATrintaDias.getDate() + 30);
    const primeiraCobranca =
      assinaturaAtual?.emTeste && assinaturaAtual.dataFim > new Date()
        ? assinaturaAtual.dataFim
        : daquiATrintaDias;

    const criada = await this.mpFetch('/preapproval', {
      method: 'POST',
      body: JSON.stringify(
        corpoDaAssinatura({
          plano,
          emailDoPagador: tenant.email,
          tenantId,
          backUrl: `${this.urlDoSite}/assinatura`,
          primeiraCobranca,
        }),
      ),
    });

    // Guarda o vínculo já: o webhook pode chegar antes do barbeiro voltar.
    await this.prisma.assinatura.updateMany({
      where: { tenantId },
      data: { mpPreapprovalId: String(criada.id) },
    });

    const link = criada.init_point;
    if (!link) {
      throw new BadRequestException(
        'O Mercado Pago não devolveu o link do checkout. Tente de novo em instantes.',
      );
    }
    return { preapprovalId: String(criada.id), initPoint: link };
  }

  /** Cancela a recorrência no Mercado Pago, se houver. */
  private async cancelarRecorrenciaNoMp(mpPreapprovalId: string | null) {
    if (!mpPreapprovalId || !this.mpToken) return;
    try {
      await this.mpFetch(`/preapproval/${mpPreapprovalId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
    } catch (e) {
      // Cancelamento local não pode travar por falha externa — mas registrar
      // é essencial: senão o barbeiro segue sendo cobrado sem ninguém ver.
      this.logger.error(
        `Falha ao cancelar a recorrência ${mpPreapprovalId} no Mercado Pago: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  /**
   * Webhook do Mercado Pago. Trata três tópicos:
   * - subscription_preapproval: o barbeiro autorizou (ou cancelou) a assinatura
   * - subscription_authorized_payment: caiu a cobrança mensal
   * - payment: pagamento avulso (o Pix por QR Code)
   *
   * Sempre responde 200: o MP reenvia o que falha, e devolver erro por uma
   * notificação que não sabemos tratar só gera retentativa infinita.
   */
  async handleWebhookMercadoPago(body: any, query: any = {}) {
    const { topico, id } = interpretarNotificacao(body, query);

    // Descartar em silêncio é o pior desfecho possível aqui: o Mercado Pago
    // marca a notificação como entregue e nunca reenvia, então o dinheiro
    // entra, a assinatura não ativa e não sobra rastro nenhum.
    if (!this.mpToken) {
      this.logger.error(
        'Webhook do Mercado Pago recebido sem MERCADO_PAGO_ACCESS_TOKEN configurado — ' +
          'a notificação foi PERDIDA. Configure a variável no servidor.',
      );
      return { ok: true };
    }
    if (!topico || !id) {
      this.logger.warn(
        `Webhook do Mercado Pago ignorado por formato não reconhecido: ${JSON.stringify({ body, query }).slice(0, 300)}`,
      );
      return { ok: true };
    }

    try {
      if (topico === 'subscription_preapproval') {
        await this.tratarAssinaturaRecorrente(id);
      } else if (topico === 'subscription_authorized_payment') {
        await this.tratarCobrancaRecorrente(id);
      } else {
        await this.tratarPagamentoAvulso(id);
      }
    } catch (e) {
      this.logger.error(
        `Webhook ${topico}/${id} falhou: ${e instanceof Error ? e.message : e}`,
      );
    }
    return { ok: true };
  }

  /** O barbeiro autorizou, pausou ou cancelou a assinatura. */
  private async tratarAssinaturaRecorrente(preapprovalId: string) {
    const mp = await this.mpFetch(`/preapproval/${preapprovalId}`);
    const ref = lerReferenciaExterna(mp.external_reference);
    if (!ref) {
      this.logger.warn(
        `Assinatura ${preapprovalId} sem referência externa reconhecível — ignorada.`,
      );
      return;
    }

    const status = traduzirStatus(mp.status);
    if (status === 'pending') return; // criada, mas ainda não autorizada

    if (status === 'canceled') {
      await this.prisma.assinatura.updateMany({
        where: { tenantId: ref.tenantId },
        data: { status: 'canceled', renovacaoAutomatica: false },
      });
      return;
    }

    // Autorizada: vale por 30 dias e renova sozinha a cada cobrança.
    const inicio = new Date();
    const fim = new Date();
    fim.setDate(fim.getDate() + 30);
    await this.prisma.assinatura.upsert({
      where: { tenantId: ref.tenantId },
      create: {
        tenantId: ref.tenantId,
        planoId: ref.planoId,
        status: 'active',
        emTeste: false,
        dataInicio: inicio,
        dataFim: fim,
        renovacaoAutomatica: true,
        mpPreapprovalId: preapprovalId,
        meioPagamento: 'recorrente',
      },
      update: {
        planoId: ref.planoId,
        status: 'active',
        emTeste: false,
        dataInicio: inicio,
        dataFim: fim,
        renovacaoAutomatica: true,
        mpPreapprovalId: preapprovalId,
        meioPagamento: 'recorrente',
        ...this.zerarAvisosDeValidade(),
      },
    });

    const plano = await this.prisma.plano.findUnique({
      where: { id: ref.planoId },
      select: { nome: true, preco: true },
    });
    if (plano) await this.avisarPlanoContratado(ref.tenantId, plano, fim, false);
  }

  /** Caiu a mensalidade: estende a validade por mais 30 dias. */
  private async tratarCobrancaRecorrente(pagamentoId: string) {
    const mp = await this.mpFetch(`/authorized_payments/${pagamentoId}`);
    const situacao = mp?.payment?.status ?? mp?.status;
    if (situacao !== 'approved') return;

    const assinatura = await this.prisma.assinatura.findFirst({
      where: { mpPreapprovalId: String(mp.preapproval_id) },
    });
    if (!assinatura) {
      this.logger.warn(
        `Cobrança ${pagamentoId} sem assinatura correspondente (preapproval ${mp.preapproval_id}).`,
      );
      return;
    }

    const fim = new Date();
    fim.setDate(fim.getDate() + 30);
    await this.prisma.assinatura.update({
      where: { id: assinatura.id },
      data: {
        status: 'active',
        emTeste: false,
        dataFim: fim,
        ...this.zerarAvisosDeValidade(),
      },
    });
  }

  /** Pix avulso por QR Code — o caminho de quem não quer recorrência. */
  private async tratarPagamentoAvulso(paymentId: string) {
    const mp = await this.mpFetch(`/v1/payments/${paymentId}`);
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { mpPaymentId: String(paymentId) },
    });
    if (!pagamento) {
      // Aconteceu no Mercado Pago mas não existe aqui. Antes sumia sem log:
      // o barbeiro pagava, a assinatura não ativava e não havia por onde
      // descobrir.
      this.logger.warn(
        `Pagamento ${paymentId} aprovado no Mercado Pago sem registro correspondente aqui.`,
      );
      return;
    }
    if (!mp.status) {
      this.logger.warn(`Pagamento ${paymentId} voltou do Mercado Pago sem status.`);
      return;
    }

    await this.prisma.pagamento.update({
      where: { id: pagamento.id },
      data: { status: mp.status },
    });
    if (mp.status !== 'approved') return;

    // Domínio próprio é taxa única de um serviço à parte: não renova plano.
    // O admin vê o pagamento em /assinaturas/pagamentos para providenciar.
    if (!pagamentoRenovaPlano(pagamento)) {
      this.logger.log(
        `Pagamento ${pagamento.id} (${pagamento.metodo}) aprovado — não renova plano.`,
      );
      return;
    }
    await this.ativarAssinaturaPaga(pagamento.tenantId, pagamento.planoId);
  }

  /** Confirmação manual pelo admin (controle do dono do SaaS). */
  async confirmarPagamentoManual(pagamentoId: number) {
    const pagamento = await this.prisma.pagamento.findUnique({ where: { id: pagamentoId } });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
    await this.prisma.pagamento.update({
      where: { id: pagamentoId },
      data: { status: 'approved' },
    });
    if (pagamento.metodo === 'pix_upgrade') {
      await this.ativarUpgradePago(pagamento.tenantId, pagamento.planoId);
      return { ok: true, status: 'approved', renovouPlano: true };
    }
    // Mesma regra do webhook: confirmar um pagamento de domínio não pode
    // renovar o plano da barbearia.
    const renovou = pagamentoRenovaPlano(pagamento);
    if (renovou) {
      await this.ativarAssinaturaPaga(pagamento.tenantId, pagamento.planoId);
    }
    return { ok: true, status: 'approved', renovouPlano: renovou };
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
