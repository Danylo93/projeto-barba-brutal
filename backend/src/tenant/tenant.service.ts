import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { calcularComissoes, intervaloDoMes } from './comissao';
import { valorCobrado, valorDoServicoNoAgendamento } from '../servico/preco';
import { escolherCorMarca, COR_PRIMARIA_PADRAO } from './cores-marca';
import {
  guardarEnderecoAntigo,
  normalizarSlug,
  problemaAntesDeNormalizar,
  problemaDoSlug,
} from './slug';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    nome: string;
    email: string;
    telefone: string;
    endereco?: string;
    cnpj?: string;
    dominio?: string;
    logo?: string;
    corPrimaria?: string;
    corSecundaria?: string;
  }) {
    // Se a cor de marca não veio no payload, atribui uma diferente das já usadas.
    let { corPrimaria, corSecundaria } = data;
    if (!corSecundaria) {
      const existentes = await this.prisma.tenant.findMany({
        select: { corSecundaria: true },
      });
      corSecundaria = escolherCorMarca(
        existentes.map((t) => t.corSecundaria),
        existentes.length,
      );
      corPrimaria = corPrimaria ?? COR_PRIMARIA_PADRAO;
    }

    return this.prisma.tenant.create({
      data: { ...data, corPrimaria, corSecundaria },
    });
  }

  async findById(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
        _count: {
          select: {
            usuarios: true,
            profissionais: true,
            servicos: true,
            agendamentos: true,
          },
        },
      },
    });
    if (tenant) {
      delete (tenant as any).senha; // nunca expor o hash da senha
      delete (tenant as any).apiKey; // a chave só aparece na tela que a gera
    }
    return tenant;
  }

  /** Todos os agendamentos do tenant (para a listagem do dono). */
  async getAgendamentos(tenantId: number) {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: { tenantId },
      include: {
        servicos: true,
        profissional: true,
        usuario: true,
      },
      orderBy: { data: 'desc' },
    });

    return agendamentos.map((a) => ({
      id: a.id,
      data: a.data,
      status: a.status,
      profissional: a.profissional ? { nome: a.profissional.nome } : undefined,
      usuario: a.usuario ? { nome: a.usuario.nome, email: a.usuario.email } : undefined,
      servicos: a.servicos.map((s) => ({
        nome: s.nome,
        preco: valorDoServicoNoAgendamento(a, s),
      })),
      valorTotal: valorCobrado(a),
    }));
  }

  /** Estatísticas para o dashboard do dono (barbeiro-admin). */
  async getStats(tenantId: number) {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [clientesAtivos, agendamentosHoje, agsMes] = await Promise.all([
      this.prisma.usuario.count({
        where: { tenantId, ativo: true, barbeiro: false },
      }),
      this.prisma.agendamento.count({
        where: { tenantId, data: { gte: inicioHoje, lte: fimHoje } },
      }),
      this.prisma.agendamento.findMany({
        where: { tenantId, data: { gte: inicioMes } },
        include: { servicos: true },
      }),
    ]);

    // ---- Indicadores de gestão (referência: relatórios dos concorrentes) ----
    const cancelados = agsMes.filter((a) => a.status === 'cancelado');
    const efetivos = agsMes.filter((a) => a.status !== 'cancelado');

    // Valor congelado no agendamento; só cai no preço de hoje nos registros
    // anteriores à migração, que não têm o congelado.
    //
    // Cancelado NÃO entra: o dashboard somava tudo e o relatório de comissões
    // só os efetivos, então as duas telas do dono se contradiziam — e o
    // "crescimento" comparava mês com cancelado contra mês sem.
    const receitaMes = efetivos.reduce((acc, ag) => acc + valorCobrado(ag), 0);
    const ticketMedio = efetivos.length ? receitaMes / efetivos.length : 0;
    const taxaCancelamento = agsMes.length
      ? (cancelados.length / agsMes.length) * 100
      : 0;

    // Mês anterior, para mostrar crescimento
    const inicioMesPassado = new Date(inicioMes);
    inicioMesPassado.setMonth(inicioMesPassado.getMonth() - 1);
    const agsMesPassado = await this.prisma.agendamento.findMany({
      where: { tenantId, data: { gte: inicioMesPassado, lt: inicioMes } },
      include: { servicos: true },
    });
    const receitaMesPassado = agsMesPassado
      .filter((a) => a.status !== 'cancelado')
      .reduce((acc, ag) => acc + valorCobrado(ag), 0);
    const crescimentoReceita = receitaMesPassado
      ? ((receitaMes - receitaMesPassado) / receitaMesPassado) * 100
      : null;

    // Serviços mais vendidos no mês
    const contagem = new Map<string, { nome: string; qtde: number; receita: number }>();
    for (const ag of efetivos) {
      for (const sv of ag.servicos) {
        const atual = contagem.get(sv.nome) ?? { nome: sv.nome, qtde: 0, receita: 0 };
        atual.qtde += 1;
        atual.receita += valorDoServicoNoAgendamento(ag, sv);
        contagem.set(sv.nome, atual);
      }
    }
    const topServicos = [...contagem.values()]
      .sort((a, b) => b.qtde - a.qtde)
      .slice(0, 5);

    // Próximos atendimentos (agenda do dia a diante)
    const proximos = await this.prisma.agendamento.findMany({
      where: {
        tenantId,
        data: { gte: new Date() },
        status: { in: ['agendado', 'confirmado'] },
      },
      include: {
        servicos: { select: { nome: true, preco: true } },
        usuario: { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
      orderBy: { data: 'asc' },
      take: 5,
    });

    return {
      clientesAtivos,
      agendamentosHoje,
      receitaMes,
      // novos indicadores
      agendamentosMes: agsMes.length,
      ticketMedio,
      taxaCancelamento,
      receitaMesPassado,
      crescimentoReceita,
      topServicos,
      proximosAtendimentos: proximos.map((p) => ({
        id: p.id,
        data: p.data,
        cliente: p.usuario?.nome ?? 'Cliente',
        profissional: p.profissional?.nome ?? '',
        servicos: p.servicos.map((s) => s.nome),
        valor: valorCobrado(p),
      })),
    };
  }

  /**
   * Relatório de comissões da equipe no mês de referência ("2026-07").
   * Considera apenas atendimentos não cancelados.
   */
  async getComissoes(tenantId: number, mes?: string) {
    const { inicio, fim, ref } = intervaloDoMes(mes);

    const [profissionais, atendimentos] = await Promise.all([
      this.prisma.profissional.findMany({
        where: { tenantId, ativo: true },
        select: { id: true, nome: true, comissaoPercent: true },
        orderBy: { nome: 'asc' },
      }),
      this.prisma.agendamento.findMany({
        where: { tenantId, data: { gte: inicio, lt: fim } },
        select: {
          profissionalId: true,
          status: true,
          valorTotal: true,
          servicos: { select: { preco: true } },
        },
      }),
    ]);

    return { mes: ref, ...calcularComissoes(profissionais, atendimentos) };
  }

  async findByEmail(email: string) {
    return this.prisma.tenant.findUnique({
      where: { email },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });
  }

  async findByDominio(dominio: string) {
    return this.prisma.tenant.findUnique({
      where: { dominio },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });
  }

  /**
   * Dados públicos da barbearia para a landing do cliente final.
   * Aceita o domínio (slug) ou o id numérico. Retorna apenas informações
   * seguras + serviços/profissionais ativos. Não expõe e-mail, cnpj, senha etc.
   */
  async getPaginaPublica(identificador: string) {
    const ehNumero = /^\d+$/.test(identificador);
    // Também procura nos endereços antigos: quem trocou de endereço não pode
    // deixar no ar um QR code impresso apontando para lugar nenhum.
    const tenant = await this.prisma.tenant.findFirst({
      where: ehNumero
        ? { id: Number(identificador), ativo: true }
        : {
            ativo: true,
            OR: [
              { dominio: identificador },
              { dominiosAntigos: { has: identificador } },
            ],
          },
      include: {
        servicos: {
          where: { ativo: true },
          orderBy: { preco: 'asc' },
          select: {
            id: true,
            nome: true,
            descricao: true,
            preco: true,
            qtdeSlots: true,
            ehCombo: true,
            imagemURL: true,
          },
        },
        profissionais: {
          where: { ativo: true },
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            nome: true,
            descricao: true,
            imagemUrl: true,
            avaliacao: true,
            quantidadeAvaliacoes: true,
          },
        },
      },
    });

    // Barbearia inexistente ou inativa: 404 explícito (em vez de 200 com corpo
    // vazio), para o front conseguir mostrar a página de "não encontrada".
    if (!tenant) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    return {
      id: tenant.id,
      nome: tenant.nome,
      endereco: tenant.endereco,
      telefone: tenant.telefone,
      dominio: tenant.dominio,
      logo: tenant.logo,
      corPrimaria: tenant.corPrimaria,
      corSecundaria: tenant.corSecundaria,
      configuracoes: tenant.configuracoes,
      servicos: tenant.servicos,
      profissionais: tenant.profissionais,
    };
  }

  /**
   * Verifica se um slug (subdomínio) está disponível para uma nova barbearia.
   * Normaliza o slug, verifica a lista de reservados e confere no banco.
   */
  async verificarSlug(bruto: string): Promise<{
    disponivel: boolean;
    slug: string;
    mensagem?: string;
  }> {
    // Rejeita punycode antes de normalizar.
    const problemaBruto = problemaAntesDeNormalizar(bruto);
    if (problemaBruto) {
      return { disponivel: false, slug: '', mensagem: problemaBruto };
    }

    const slug = normalizarSlug(bruto);
    const problema = problemaDoSlug(slug);
    if (problema) {
      return { disponivel: false, slug, mensagem: problema };
    }

    // Verifica se já existe alguma barbearia usando este slug (ativo ou antigo).
    const ocupado = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ dominio: slug }, { dominiosAntigos: { has: slug } }],
      },
      select: { id: true },
    });

    if (ocupado) {
      return {
        disponivel: false,
        slug,
        mensagem: 'Este endereço já está em uso. Escolha outro.',
      };
    }

    return { disponivel: true, slug };
  }

  /**
   * Verifica se um CPF/CNPJ já está cadastrado por outra barbearia.
   * Valida o formato e checa no banco.
   */
  async verificarDocumento(bruto: string): Promise<{
    disponivel: boolean;
    mensagem?: string;
  }> {
    const { limparDocumento, tipoDoDocumento } = await import('../common/documento');

    const documento = limparDocumento(bruto);
    const tipo = tipoDoDocumento(documento);
    if (!tipo) {
      return {
        disponivel: false,
        mensagem: documento.length === 11
          ? 'CPF inválido. Verifique os números.'
          : documento.length === 14
            ? 'CNPJ inválido. Verifique os números.'
            : 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
      };
    }

    const existente = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ documento }, { cnpj: documento }],
      },
      select: { id: true },
    });

    if (existente) {
      return {
        disponivel: false,
        mensagem: 'Já existe uma barbearia cadastrada com esse CPF/CNPJ.',
      };
    }

    return { disponivel: true };
  }

  /**
   * Verifica se um e-mail já está cadastrado como barbearia (tenant).
   */
  async verificarEmail(email: string): Promise<{
    disponivel: boolean;
    mensagem?: string;
  }> {
    const limpo = (email || '').trim().toLowerCase();
    if (!limpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
      return { disponivel: false, mensagem: 'E-mail inválido.' };
    }

    const existente = await this.prisma.tenant.findUnique({
      where: { email: limpo },
      select: { id: true },
    });

    if (existente) {
      return {
        disponivel: false,
        mensagem: 'Este e-mail já está cadastrado. Entre com a conta existente ou recupere a senha.',
      };
    }

    return { disponivel: true };
  }

  async fixLatita() {
    return this.prisma.tenant.update({
      where: { id: 14 },
      data: { dominio: 'latita' },
    });
  }

  /**
   * Campos que o dono pode alterar na própria barbearia.
   *
   * A lista existe porque tipo de TypeScript some em tempo de execução:
   * repassar o corpo da requisição direto para o Prisma deixava QUALQUER
   * campo passar. Dava para uma barbearia suspensa se reativar (`ativo`),
   * zerar o próprio CPF/CNPJ para reciclar o teste grátis (`documento`) e
   * gravar senha sem hash.
   */
  private static readonly CAMPOS_DO_DONO = [
    'nome',
    'email',
    'telefone',
    'endereco',
    'dominio',
    'logo',
    'corPrimaria',
    'corSecundaria',
    'configuracoes',
  ] as const;

  /** Só o admin do SaaS suspende ou reativa uma barbearia. */
  private static readonly CAMPOS_DO_ADMIN = [
    ...TenantService.CAMPOS_DO_DONO,
    'ativo',
  ] as const;

  private apenas(data: any, permitidos: readonly string[]) {
    const limpo: Record<string, any> = {};
    for (const campo of permitidos) {
      if (data && Object.prototype.hasOwnProperty.call(data, campo)) {
        limpo[campo] = data[campo];
      }
    }
    return limpo;
  }

  async update(id: number, data: any, comoAdmin = false) {
    const limpo = this.apenas(
      data,
      comoAdmin ? TenantService.CAMPOS_DO_ADMIN : TenantService.CAMPOS_DO_DONO,
    );

    if (limpo.dominio !== undefined) {
      await this.prepararTrocaDeEndereco(id, limpo);
    }

    return this.prisma.tenant.update({ where: { id }, data: limpo });
  }

  /**
   * Valida o novo endereço e guarda o antigo.
   *
   * Antes este campo aceitava qualquer coisa: o dono gravava o que quisesse em
   * `dominio`. Enquanto era só o final da URL (`/barbearia/latita`) o estrago
   * era pequeno; virando subdomínio, o campo decide QUAL endereço da nossa
   * marca a barbearia ocupa — e "www" ou "suporte" nas mãos erradas viram
   * página de golpe com o nosso nome.
   */
  private async prepararTrocaDeEndereco(id: number, limpo: Record<string, any>) {
    // Duas conferências, e a ordem importa: a primeira olha o que a pessoa
    // mandou, a segunda o que sobra depois de normalizar.
    const suspeito = problemaAntesDeNormalizar(limpo.dominio);
    if (suspeito) throw new BadRequestException(suspeito);

    const novo = normalizarSlug(limpo.dominio);
    const problema = problemaDoSlug(novo);
    if (problema) throw new BadRequestException(problema);

    const atual = await this.prisma.tenant.findUnique({
      where: { id },
      select: { dominio: true, dominiosAntigos: true },
    });
    if (!atual) throw new NotFoundException('Barbearia não encontrada.');

    if (atual.dominio === novo) {
      // Nada mudou de fato: não mexe no histórico à toa.
      limpo.dominio = novo;
      return;
    }

    const jaEDeOutra = await this.prisma.tenant.findFirst({
      where: {
        id: { not: id },
        OR: [{ dominio: novo }, { dominiosAntigos: { has: novo } }],
      },
      select: { id: true },
    });
    // Também barra endereço que outra barbearia já usou: soltá-lo permitiria
    // pegar o endereço antigo de um concorrente e receber o tráfego dele.
    if (jaEDeOutra) {
      throw new BadRequestException(
        'Este endereço já está em uso. Escolha outro.',
      );
    }

    limpo.dominio = novo;
    if (atual.dominio) {
      limpo.dominiosAntigos = guardarEnderecoAntigo(
        atual.dominiosAntigos,
        atual.dominio,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        include: {
          assinatura: {
            include: {
              plano: true,
            },
          },
          _count: {
            select: {
              usuarios: true,
              profissionais: true,
              servicos: true,
              agendamentos: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);

    // Nem o admin do SaaS precisa ver hash de senha ou a chave de API alheia.
    for (const t of tenants as any[]) {
      delete t.senha;
      delete t.apiKey;
    }

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: number) {
    return this.prisma.tenant.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async checkLimits(tenantId: number) {
    const tenant = await this.findById(tenantId);
    
    if (!tenant?.assinatura) {
      throw new Error('Tenant sem assinatura ativa');
    }

    const plano = tenant.assinatura.plano;
    const counts = tenant._count;

    return {
      usuarioLimit: counts.usuarios >= plano.maxUsuarios,
      agendamentoLimit: counts.agendamentos >= plano.maxAgendamentos,
      limits: {
        maxUsuarios: plano.maxUsuarios,
        maxAgendamentos: plano.maxAgendamentos,
        currentUsuarios: counts.usuarios,
        currentAgendamentos: counts.agendamentos,
      },
    };
  }

  async generateApiKey(tenantId: number) {
    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const apiKey = `bb_${token}`; // bb_ para Barba Brutal

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { apiKey },
    });
  }
}
