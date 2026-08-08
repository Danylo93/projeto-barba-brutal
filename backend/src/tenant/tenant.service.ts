import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { calcularComissoes, intervaloDoMes } from './comissao';
import { valorCobrado, valorDoServicoNoAgendamento } from '../servico/preco';
import { escolherCorMarca, COR_PRIMARIA_PADRAO } from './cores-marca';
import { validarChavePix } from '../sinal/pix-brcode';
import {
  guardarEnderecoAntigo,
  normalizarSlug,
  problemaAntesDeNormalizar,
  problemaDoSlug,
} from './slug';
import {
  configuracaoDeRetorno,
  configuracaoDeRetornoValida,
} from '../lembrete/retorno';
import { testeGratisVigente } from '../assinatura/teste-gratis';

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
    if (tenant?.assinatura && testeGratisVigente(tenant.assinatura)) {
      const premium = await this.prisma.plano.findFirst({
        where: { nome: 'Premium', ativo: true },
      });
      if (premium) tenant.assinatura.plano = premium;
    }
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
            // Quem faz o quê. Sem isto a página pública oferece um serviço e
            // depois descobre, no POST, que aquele profissional não o faz.
            servicos: { select: { id: true } },
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
      // Como esta barbearia recebe. A chave Pix NÃO sai daqui: o cliente não
      // precisa dela para marcar, e ela só aparece dentro do Pix já montado,
      // com o valor certo, depois que o horário existe.
      agendamentoSemConta: tenant.agendamentoSemConta,
      sinal: tenant.sinalAtivo
        ? {
            ativo: true,
            percent: tenant.sinalPercent,
            minimo: tenant.sinalMinimo,
            prazoMinutos: tenant.sinalPrazoMinutos,
          }
        : { ativo: false },
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
    // 1. Procurar quem está segurando o domínio 'latita'
    const donoAntigo = await this.prisma.tenant.findUnique({
      where: { dominio: 'latita' },
    });

    // 2. Se existe e não é o 14, renomeamos o domínio dele para liberar
    if (donoAntigo && donoAntigo.id !== 14) {
      await this.prisma.tenant.update({
        where: { id: donoAntigo.id },
        data: { dominio: `latita-antigo-${donoAntigo.id}` },
      });
    }

    // 3. Agora podemos atribuir com segurança ao 14
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

  /** A instance guardada hoje para esta barbearia, ou string vazia. */
  private async instanceGuardada(id: number): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { configuracoes: true },
    });
    return String(((tenant?.configuracoes as any) ?? {}).evolutionInstance ?? '').trim();
  }

  /**
   * A instance da Evolution é campo do admin do SaaS.
   *
   * Quem cria a instance no servidor da Evolution é o admin — o dono da
   * barbearia não tem como inventar uma que exista. Deixar o campo na mão
   * dele só abria duas portas: digitar um nome que não existe (e o WhatsApp
   * dele nunca conectar, sem ninguém entender por quê) ou digitar o nome da
   * instance de OUTRA barbearia.
   *
   * O `PUT /tenants/me/configuracoes` grava o JSON de configurações inteiro.
   * Por isso não basta ignorar o campo: se o dono salvar o horário de
   * funcionamento e o payload não trouxer a instance, ela some do banco e o
   * atendimento morre calado. Aqui ela é sempre reposta a partir do que está
   * guardado.
   */
  private async cuidarDaInstance(
    id: number,
    configuracoes: any,
    comoAdmin: boolean,
  ): Promise<any> {
    const conf = { ...configuracoes };

    if ('lembreteRetorno' in conf) {
      if (!configuracaoDeRetornoValida(conf.lembreteRetorno)) {
        throw new BadRequestException(
          'O lembrete de retorno aceita somente 15, 20, 30 ou 40 dias.',
        );
      }
      conf.lembreteRetorno = configuracaoDeRetorno(conf);
    }

    if (!comoAdmin) {
      const guardada = await this.instanceGuardada(id);
      if (guardada) conf.evolutionInstance = guardada;
      else delete conf.evolutionInstance;
      return conf;
    }

    if (!('evolutionInstance' in conf)) return conf;

    const instancia = String(conf.evolutionInstance ?? '').trim();
    await this.garantirInstanceLivre(id, instancia);
    if (instancia) conf.evolutionInstance = instancia;
    else delete conf.evolutionInstance;
    return conf;
  }

  /**
   * O nome existe e ainda não é de outra barbearia.
   *
   * A instance é o que diz de quem é a conversa que chega do WhatsApp. Duas
   * barbearias com o mesmo nome significa uma lendo e cancelando os
   * agendamentos da outra.
   */
  private async garantirInstanceLivre(id: number, instancia: string) {
    if (!instancia) return;

    if (!/^[a-zA-Z0-9._:-]{3,80}$/.test(instancia)) {
      throw new BadRequestException('Instance da Evolution API inválida.');
    }

    // Barbearia suspensa também segura o nome. Antes a busca filtrava por
    // `ativo: true`: bastava uma barbearia estar desativada para o nome dela
    // ser dado a outra — e no dia em que voltasse, as duas dividiriam a mesma
    // caixa de entrada. Para reaproveitar, o admin tira a instance da antiga
    // primeiro.
    const existente = await this.prisma.tenant.findFirst({
      where: {
        id: { not: id },
        configuracoes: {
          path: ['evolutionInstance'],
          equals: instancia,
        } as any,
      },
      select: { id: true, nome: true, ativo: true },
    });
    if (existente) {
      throw new BadRequestException(
        existente.ativo
          ? `Esta instance já é da barbearia ${existente.nome}.`
          : `Esta instance ainda está vinculada à barbearia ${existente.nome}, que está suspensa. Tire a instance dela antes de reaproveitar o nome.`,
      );
    }
  }

  /**
   * Define (ou tira) a instance de uma barbearia. Só o admin do SaaS chega
   * aqui — é ele quem cria a instance na Evolution.
   */
  async definirInstanceDaEvolution(id: number, valor: string) {
    const instancia = String(valor ?? '').trim();
    await this.garantirInstanceLivre(id, instancia);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { configuracoes: true },
    });
    if (!tenant) throw new NotFoundException('Barbearia não encontrada.');

    const conf = { ...((tenant.configuracoes as any) ?? {}) };
    if (instancia) conf.evolutionInstance = instancia;
    else delete conf.evolutionInstance;

    const salvo = await this.prisma.tenant.update({
      where: { id },
      data: { configuracoes: conf },
      select: { id: true, nome: true, configuracoes: true },
    });
    return { id: salvo.id, nome: salvo.nome, instance: instancia || null };
  }

  async update(id: number, data: any, comoAdmin = false) {
    const limpo = this.apenas(
      data,
      comoAdmin ? TenantService.CAMPOS_DO_ADMIN : TenantService.CAMPOS_DO_DONO,
    );

    if (limpo.configuracoes !== undefined) {
      // `configuracoes: null` gravaria null por cima de tudo — e levaria a
      // instance junto, desligando o WhatsApp da barbearia sem que ninguém
      // tenha pedido isso. Só objeto entra aqui.
      if (!limpo.configuracoes || typeof limpo.configuracoes !== 'object') {
        delete limpo.configuracoes;
      } else {
        limpo.configuracoes = await this.cuidarDaInstance(
          id,
          limpo.configuracoes,
          comoAdmin,
        );
      }
    }

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

  /**
   * Salva a chave Pix, a regra do sinal e se a barbearia aceita agendamento
   * sem cadastro.
   *
   * Ligar o sinal sem chave Pix é recusado aqui, e não deixado para dar
   * errado depois: sem chave, `calcularSinal` devolve zero e a barbearia
   * ficaria com a funcionalidade "ligada" sem cobrar nada de ninguém, sem
   * nenhum aviso.
   */
  async atualizarRecebimento(tenantId: number, dados: any) {
    const mudancas: any = {};

    if (dados?.chavePix !== undefined) {
      const chave = String(dados.chavePix ?? '').trim();
      if (chave && !validarChavePix(chave)) {
        throw new BadRequestException(
          'Chave Pix inválida. Use CPF, CNPJ, e-mail, telefone com +55 ou chave aleatória.',
        );
      }
      mudancas.chavePix = chave || null;
    }

    if (dados?.sinalPercent !== undefined) {
      mudancas.sinalPercent = this.percentual(dados.sinalPercent);
    }
    if (dados?.sinalMinimo !== undefined) {
      const minimo = Number(dados.sinalMinimo);
      if (!Number.isFinite(minimo) || minimo < 0) {
        throw new BadRequestException('O valor mínimo do sinal não pode ser negativo.');
      }
      mudancas.sinalMinimo = Number(minimo.toFixed(2));
    }
    if (dados?.sinalPrazoMinutos !== undefined) {
      const minutos = Number(dados.sinalPrazoMinutos);
      if (!Number.isInteger(minutos) || minutos < 5 || minutos > 1440) {
        throw new BadRequestException(
          'O prazo do sinal tem que ficar entre 5 minutos e 24 horas.',
        );
      }
      mudancas.sinalPrazoMinutos = minutos;
    }
    if (dados?.agendamentoSemConta !== undefined) {
      mudancas.agendamentoSemConta = Boolean(dados.agendamentoSemConta);
    }

    if (dados?.sinalAtivo !== undefined) {
      const ligando = Boolean(dados.sinalAtivo);
      if (ligando) {
        const atual = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { chavePix: true, sinalPercent: true, sinalMinimo: true },
        });
        const chave = mudancas.chavePix ?? atual?.chavePix;
        if (!chave) {
          throw new BadRequestException(
            'Cadastre a chave Pix da barbearia antes de exigir sinal — é para ela que o dinheiro vai.',
          );
        }
        const percent = mudancas.sinalPercent ?? atual?.sinalPercent ?? 0;
        const minimo = mudancas.sinalMinimo ?? atual?.sinalMinimo ?? 0;
        if (percent <= 0 && minimo <= 0) {
          throw new BadRequestException(
            'Defina o percentual ou o valor mínimo do sinal — do contrário nada seria cobrado.',
          );
        }
      }
      mudancas.sinalAtivo = ligando;
    }

    // Apagar a chave com o sinal ligado deixava a funcionalidade "ativa" sem
    // cobrar nada: `calcularSinal` devolve zero sem chave, e a página pública
    // continuava prometendo "sinal de R$ X" que nunca era pedido. Falhava
    // para o lado seguro, mas em silêncio.
    if (mudancas.chavePix === null) {
      const continuaExigindo =
        mudancas.sinalAtivo ??
        (
          await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { sinalAtivo: true },
          })
        )?.sinalAtivo;

      if (continuaExigindo) {
        throw new BadRequestException(
          'Desligue o sinal antes de apagar a chave Pix — sem ela não há para onde mandar o dinheiro.',
        );
      }
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: mudancas,
      select: {
        id: true,
        chavePix: true,
        sinalAtivo: true,
        sinalPercent: true,
        sinalMinimo: true,
        sinalPrazoMinutos: true,
        agendamentoSemConta: true,
      },
    });
  }

  private percentual(valor: unknown): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
      throw new BadRequestException('O percentual do sinal tem que ficar entre 0 e 100.');
    }
    return Number(numero.toFixed(2));
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
