import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../db/prisma.service';
import { AgendamentoRepository } from '../agendamento/agendamento.repository';
import { WhatsappService } from './whatsapp.service';
import { instanciaDaBarbearia } from '../lembrete/lembrete.service';
import {
  ConfiguracaoDoBotInvalida,
  MOTIVO_SEM_INSTANCIA,
  TokenDoBotInvalido,
  conferirTenantPedido,
  quemEsteTokenAutoriza,
} from './token-do-bot';
import {
  ROBO_FORA_DO_PLANO,
  comoOClienteLe,
  diaEmBrasilia,
  horariosLivres,
  instanteEmBrasilia,
  planoTemRobo,
  porqueNaoDaParaRemarcar,
} from './conversa';
import {
  duracaoEmMinutos,
  expedienteDoDia,
  validarServicosDoAgendamento,
} from '../agendamento/agendamento.validacao';

@Injectable()
export class WhatsappAgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agendamentos: AgendamentoRepository,
    private readonly whatsapp: WhatsappService,
  ) {}

  private normalizarInstance(valor: string): string {
    return String(valor ?? '').trim().toLowerCase();
  }

  /**
   * Quem é a barbearia desta requisição.
   *
   * O tenant sai do TOKEN, não da query string — a regra do projeto. Antes o
   * `WHATSAPP_BOT_TOKEN` global era aceito com qualquer `?tenantId=`: quem
   * tivesse esse token trocava o número na URL e lia a agenda, os telefones
   * dos clientes, criava e cancelava agendamento de qualquer barbearia.
   */
  /**
   * Qual barbearia esta requisição pode operar.
   *
   * O tenant sai do TOKEN ou da INSTÂNCIA — nunca do `?tenantId=`, que só é
   * conferido. Antes o token do n8n era aceito com qualquer tenantId na URL:
   * bastava trocar o número para ler a agenda, os telefones dos clientes,
   * criar e cancelar agendamento de qualquer barbearia.
   *
   * A instância é o identificador certo porque já é única por barbearia,
   * validada no cadastro, e chega no fluxo pelo webhook da própria Evolution.
   * Barbearia nova não pede variável de ambiente nem deploy: o dono configura
   * a instância dele no painel e o bot passa a atender.
   */
  private async autenticar(
    token: string,
    tenantTexto?: string,
    instance?: string,
  ): Promise<number> {
    let autorizacao;
    try {
      autorizacao = quemEsteTokenAutoriza(token, {
        tokenGlobal: process.env.WHATSAPP_BOT_TOKEN,
        tokensPorTenant: process.env.WHATSAPP_BOT_TOKENS,
      });
    } catch (erro) {
      // Configuração errada do servidor não é credencial errada do chamador:
      // 503 com o que falta, para não mandar ninguém caçar senha à toa.
      if (erro instanceof ConfiguracaoDoBotInvalida) {
        throw new ServiceUnavailableException(erro.message);
      }
      if (erro instanceof TokenDoBotInvalido) {
        throw new UnauthorizedException(erro.message);
      }
      throw erro;
    }

    let tenantId: number;
    if (autorizacao.tipo === 'barbearia') {
      tenantId = autorizacao.tenantId;
    } else {
      if (!String(instance ?? '').trim()) {
        throw new BadRequestException(MOTIVO_SEM_INSTANCIA);
      }
      const { tenantId: resolvido } = await this.resolverPorInstance(instance!);
      tenantId = resolvido;
    }

    let confirmado: number;
    try {
      confirmado = conferirTenantPedido(tenantId, tenantTexto);
    } catch (erro) {
      if (erro instanceof TokenDoBotInvalido) {
        throw new UnauthorizedException(erro.message);
      }
      throw erro;
    }

    await this.garantirPlanoComRobo(confirmado);
    return confirmado;
  }

  /**
   * O robô só atende barbearia nos planos Profissional e Premium.
   *
   * Não havia checagem nenhuma: bastava a barbearia configurar a instância da
   * Evolution e o robô atendia em qualquer plano — inclusive em assinatura
   * vencida. O robô é o argumento dos planos pagos mais caros; de graça para
   * todo mundo, ele deixa de ser argumento.
   */
  private async garantirPlanoComRobo(tenantId: number): Promise<void> {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { tenantId },
      select: {
        status: true,
        dataFim: true,
        plano: { select: { nome: true, features: true } },
      },
    });

    const valendo =
      !!assinatura &&
      ['active', 'trialing'].includes(String(assinatura.status)) &&
      (!assinatura.dataFim || new Date(assinatura.dataFim).getTime() > Date.now());

    if (!valendo || !planoTemRobo(assinatura!.plano)) {
      throw new ForbiddenException(ROBO_FORA_DO_PLANO);
    }
  }

  /**
   * Só confere se o token é um dos nossos, sem escolher barbearia.
   *
   * Serve para a rota `/resolver`, que precisa de porteiro mas não pode
   * chamar `autenticar` — é ela que resolve a instância que o `autenticar`
   * usa. Aberta, ela deixava qualquer um chutar nomes de instância e
   * descobrir o id e o nome de cada barbearia do SaaS.
   */
  private conferirToken(token: string): void {
    try {
      quemEsteTokenAutoriza(token, {
        tokenGlobal: process.env.WHATSAPP_BOT_TOKEN,
        tokensPorTenant: process.env.WHATSAPP_BOT_TOKENS,
      });
    } catch (erro) {
      if (erro instanceof ConfiguracaoDoBotInvalida) {
        throw new ServiceUnavailableException(erro.message);
      }
      if (erro instanceof TokenDoBotInvalido) {
        throw new UnauthorizedException(erro.message);
      }
      throw erro;
    }
  }

  async resolver(token: string, instance: string) {
    this.conferirToken(token);
    return this.resolverPorInstance(instance);
  }

  async resolverPorInstance(instance: string) {
    const normalizada = this.normalizarInstance(instance);
    if (!normalizada) throw new BadRequestException('instance inválida.');

    const tenants = await this.prisma.tenant.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, configuracoes: true },
    });

    const tenant = tenants.find((t) => {
      const conf = (t.configuracoes as any) || {};
      const inst = this.normalizarInstance(conf.evolutionInstance || conf.instance || conf.whatsappInstance);
      return inst === normalizada;
    });

    if (!tenant) {
      throw new NotFoundException('Nenhum tenant encontrado para esta instance da Evolution.');
    }

    return {
      tenantId: tenant.id,
      tenantNome: tenant.nome,
    };
  }

  private digitos(valor: string): string {
    const numero = String(valor ?? '').replace(/\D/g, '');
    if (numero.length < 10) throw new BadRequestException('Telefone inválido.');
    return numero.startsWith('55') ? numero : `55${numero}`;
  }

  private telefoneCanonico(valor: string): string | null {
    const numero = String(valor ?? '').replace(/\D/g, '');
    if (numero.length < 10) return null;
    return numero.startsWith('55') ? numero : `55${numero}`;
  }

  private async cliente(tenantId: number, telefone: string, nome?: string, criar = false) {
    const numero = this.digitos(telefone);
    // Só os candidatos, não a base inteira. Isto carregava TODOS os clientes
    // da barbearia na memória a cada mensagem de WhatsApp para comparar
    // telefone em JavaScript — com mil clientes, mil linhas por "oi".
    const semDdi = numero.slice(2);
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        tenantId,
        ativo: true,
        OR: [
          { telefone: { contains: semDdi } },
          { telefone: { contains: numero } },
        ],
      },
      take: 25,
    });
    let usuario = usuarios.find((u) => this.telefoneCanonico(u.telefone) === numero);
    if (!usuario && criar) {
      const senha = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      usuario = await this.prisma.usuario.create({
        data: {
          tenantId,
          nome: String(nome || 'Cliente WhatsApp').slice(0, 100),
          telefone: numero,
          email: `whatsapp.${numero}.${tenantId}@cliente.local`,
          senha,
        },
      });
    }
    if (!usuario) {
      throw new NotFoundException(
        'Não achei nenhum cadastro com este número. Me diz seu nome e o que você quer fazer que eu abro um para você.',
      );
    }
    return usuario;
  }

  async catalogo(token: string, tenantTexto?: string, instance?: string) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);
    const [tenant, servicos, profissionais] = await Promise.all([
      this.prisma.tenant.findFirst({ where: { id: tenantId, ativo: true }, select: { id: true, nome: true } }),
      this.prisma.servico.findMany({ where: { tenantId, ativo: true }, select: { id: true, nome: true, preco: true, qtdeSlots: true } }),
      this.prisma.profissional.findMany({ where: { tenantId, ativo: true }, select: { id: true, nome: true, servicos: { select: { id: true } } } }),
    ]);
    if (!tenant) throw new NotFoundException('Barbearia não encontrada.');
    return { tenant, servicos, profissionais };
  }

  async listar(token: string, tenantTexto: string, telefone: string, instance?: string) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);
    const usuario = await this.cliente(tenantId, telefone);
    return this.agendamentos.buscarPorUsuario(usuario.id);
  }

  async criar(token: string, tenantTexto: string, body: any, instance?: string) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);
    const usuario = await this.cliente(tenantId, body.telefone, body.nome, true);

    // Mesmo cuidado do reagendamento: sem fuso na ponta, a hora do cliente
    // virava a hora do servidor.
    const quando = instanteEmBrasilia(body.data);
    if (!quando) {
      throw new BadRequestException(
        'Não consegui entender essa data. Me manda dia e hora — por exemplo, 07/08 às 15:00.',
      );
    }
    const recusa = porqueNaoDaParaRemarcar({ status: 'agendado' }, body.data);
    if (recusa) throw new BadRequestException(recusa);

    const id = await this.agendamentos.salvar({
      tenantId,
      usuarioId: usuario.id,
      profissionalId: Number(body.profissionalId),
      servicos: Array.isArray(body.servicos) ? body.servicos.map(Number) : [Number(body.servicoId)],
      data: quando,
      observacoes: body.observacoes,
    } as any);

    const criado = await this.agendamentos.buscarPorId(id, tenantId);
    return { ...(criado as any), quando: comoOClienteLe(quando) };
  }

  private async doCliente(tenantId: number, idTexto: string, telefone: string) {
    const id = Number(idTexto);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(
        'Não entendi qual agendamento é. Me diz o número dele — se não souber, eu listo os seus.',
      );
    }
    const usuario = await this.cliente(tenantId, telefone);
    const agendamento = await this.agendamentos.buscarPorId(id, tenantId);
    // A mesma frase para "não existe" e para "é de outra pessoa", de
    // propósito: distinguir as duas contaria a quem chutasse números quais
    // ids existem naquela barbearia.
    if (!agendamento || agendamento.usuarioId !== usuario.id) {
      throw new NotFoundException(
        'Não encontrei esse agendamento no seu nome. Quer que eu liste os que você tem marcados?',
      );
    }
    return agendamento;
  }

  async cancelar(token: string, tenantTexto: string, idTexto: string, telefone: string, instance?: string) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);
    const agendamento = await this.doCliente(tenantId, idTexto, telefone);
    if (agendamento.status === 'cancelado') {
      return { id: agendamento.id, status: 'cancelado', jaEstava: true };
    }
    if (agendamento.status === 'concluido') {
      throw new BadRequestException(
        'Esse atendimento já foi realizado, então não há o que cancelar.',
      );
    }
    await this.agendamentos.atualizarStatus(agendamento.id, tenantId, 'cancelado');
    const completo = await this.prisma.agendamento.findUnique({
      where: { id: agendamento.id },
      include: { usuario: true, profissional: { include: { usuario: true } }, tenant: true },
    });
    const textoCliente = `Seu agendamento #${agendamento.id} na ${completo?.tenant.nome ?? 'barbearia'} foi cancelado.`;
    const textoBarbeiro = `Agendamento #${agendamento.id} de ${completo?.usuario.nome ?? 'cliente'} foi cancelado pelo WhatsApp.`;
    await Promise.all([
      completo?.usuario.telefone ? this.whatsapp.enviarTexto(completo.usuario.telefone, textoCliente) : false,
      completo?.profissional.usuario?.telefone
        ? this.whatsapp.enviarTexto(completo.profissional.usuario.telefone, textoBarbeiro)
        : false,
    ]);
    return { id: agendamento.id, status: 'cancelado' };
  }

  /**
   * Remarca — e, quando não dá, explica em português por quê.
   *
   * A recusa é metade do trabalho aqui. O cliente que pede um horário de hoje
   * que já passou precisa ouvir *isso*, com as horas atuais, e não "Bad
   * Request" nem a frase genérica que serve para quem digitou o ano errado.
   * Cada motivo tem a sua frase, e as que sobram vêm do próprio agendamento
   * (fora do expediente, horário ocupado, folga do barbeiro) já escritas para
   * quem vai ler.
   */
  async reagendar(
    token: string,
    tenantTexto: string,
    idTexto: string,
    body: { telefone?: string; data?: string },
    instance?: string,
  ) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);
    const agendamento = await this.doCliente(tenantId, idTexto, body.telefone || '');

    const recusa = porqueNaoDaParaRemarcar(agendamento as any, body.data);
    if (recusa) throw new BadRequestException(recusa);

    await this.garantirQueAindaExiste(tenantId, agendamento);

    // O fuso é do cliente, não do servidor: `new Date('2026-08-07T15:00')` no
    // Render (UTC) virava meio-dia em Brasília, e a confirmação saía com um
    // horário que ninguém pediu.
    const quando = instanteEmBrasilia(body.data)!;
    await this.agendamentos.reagendar(agendamento.id, tenantId, quando);

    const novo = await this.agendamentos.buscarPorId(agendamento.id, tenantId);
    return {
      ...(novo as any),
      // Pronto para o robô repetir de volta sem ter que formatar data.
      quando: comoOClienteLe(quando),
    };
  }

  /**
   * O que foi marcado ainda existe?
   *
   * A barbearia muda de cardápio e de equipe entre a marcação e a remarcação.
   * Quando o serviço sai da vitrine ou o barbeiro é desligado, a validação lá
   * embaixo responde "Um ou mais serviços são inválidos" e "Profissional
   * inválido" — frases de banco de dados, que o cliente leria no WhatsApp sem
   * entender nada e sem saber o que fazer.
   */
  private async garantirQueAindaExiste(tenantId: number, agendamento: any): Promise<void> {
    const ids = (agendamento?.servicos ?? []).map((s: any) => s.id);

    const [profissional, ativos] = await Promise.all([
      this.prisma.profissional.findFirst({
        where: { id: agendamento.profissionalId, tenantId, ativo: true },
        select: { id: true },
      }),
      ids.length
        ? this.prisma.servico.findMany({
            where: { id: { in: ids }, tenantId, ativo: true },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (!profissional) {
      throw new BadRequestException(
        'Esse profissional não está mais atendendo aqui. Quer marcar com outro da equipe?',
      );
    }
    if (ativos.length !== ids.length) {
      throw new BadRequestException(
        'Um dos serviços desse agendamento saiu do nosso cardápio. Me diz o que você quer fazer que eu marco de novo.',
      );
    }
  }

  /**
   * Manda a resposta do atendente de volta para o cliente.
   *
   * O fluxo do n8n falava direto com a Evolution, e por isso precisava saber a
   * URL dela e carregar a apikey numa credencial. Duas coisas erradas: era
   * mais um passo de configuração por instalação — e foi exatamente onde
   * quebrou, com a URL de exemplo (`evolution.seudominio.com`) publicada — e
   * espalhava a apikey da Evolution para fora do backend.
   *
   * Aqui o backend já tem URL, apikey e a instância da barbearia. O n8n só
   * diz para quem e o quê, com o token que ele já usa nas outras ferramentas.
   */
  async responder(
    token: string,
    tenantTexto: string,
    body: { telefone?: string; texto?: string },
    instance?: string,
  ) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);

    const texto = String(body?.texto ?? '').trim();
    if (!texto) throw new BadRequestException('Sem texto para enviar.');

    const numero = String(body?.telefone ?? '').replace(/\D/g, '');
    if (numero.length < 10) throw new BadRequestException('Telefone inválido.');

    // A instância sai da barbearia que o token/instance resolveu — nunca do
    // corpo. Sem isso, um token válido mandaria mensagem pelo número de outra.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { configuracoes: true },
    });
    const daBarbearia = instanciaDaBarbearia(tenant);

    if (!this.whatsapp.configuradoPara(daBarbearia)) {
      throw new ServiceUnavailableException(
        'O WhatsApp desta barbearia não está conectado.',
      );
    }

    const enviou = await this.whatsapp.enviarTexto(numero, texto, daBarbearia);
    if (!enviou) {
      throw new ServiceUnavailableException(
        'A Evolution recusou o envio da mensagem.',
      );
    }
    return { enviado: true, para: numero };
  }

  /**
   * Horários livres de um profissional num dia.
   *
   * Sem isto o robô só sabia chutar: mandava um horário, tomava recusa, e o
   * cliente ouvia uma negativa atrás da outra sem nunca receber uma opção.
   * Atendente de verdade responde "tenho 15h ou 16h30" — é o que este endpoint
   * permite responder.
   */
  async horarios(
    token: string,
    tenantTexto: string,
    params: { data?: string; profissionalId?: string; servicos?: string },
    instance?: string,
  ) {
    const tenantId = await this.autenticar(token, tenantTexto, instance);

    const quando = instanteEmBrasilia(params.data);
    if (!quando) {
      throw new BadRequestException(
        'Me diz o dia que você quer — por exemplo, 07/08 ou 2026-08-07.',
      );
    }
    const dia = diaEmBrasilia(quando);

    const profissionalId = Number(params.profissionalId);
    if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
      throw new BadRequestException('Diga com qual profissional você quer marcar.');
    }
    const profissional = await this.prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId, ativo: true },
      select: { id: true, nome: true, servicos: { select: { id: true } } },
    });
    if (!profissional) {
      throw new NotFoundException('Esse profissional não atende nesta barbearia.');
    }

    // Sem serviço informado vale um slot: é a menor janela possível, então
    // sobra o máximo de opções para o robô conversar.
    const pedidos = String(params.servicos ?? '').trim();
    const ids = pedidos
      .split(',')
      .map((s) => Number(String(s).trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    // `servicos=undefined` — que é o que sai quando o agente monta a URL com
    // um id que ele não tem — virava "nenhum serviço" e devolvia a lista
    // inteira calculada para 30 minutos. O robô prometia horário para um
    // atendimento de uma hora que não cabia ali.
    if (pedidos && !ids.length) {
      throw new BadRequestException(
        'Não entendi qual serviço você quer. Me diz pelo nome que eu procuro no cardápio.',
      );
    }

    const servicos = ids.length
      ? await this.prisma.servico.findMany({
          where: { id: { in: ids }, tenantId, ativo: true },
          select: { id: true, nome: true, qtdeSlots: true, ehCombo: true },
        })
      : [];
    if (ids.length && servicos.length !== ids.length) {
      throw new BadRequestException(
        'Um dos serviços não existe mais no cardápio. Me diz de novo o que você quer fazer.',
      );
    }

    // As MESMAS regras que a marcação aplica: combo é exclusivo, e o
    // profissional só faz o que está vinculado a ele. Sem isto, a lista saía
    // cheia de horários para um serviço que aquele barbeiro não faz — e o
    // robô oferecia o que a API ia recusar em seguida. Prometer e negar é
    // pior do que já dizer não.
    if (servicos.length) {
      const erro = validarServicosDoAgendamento(
        servicos,
        profissional.servicos.map((s) => s.id),
      );
      if (erro) throw new BadRequestException(erro);
    }

    const duracaoMin = duracaoEmMinutos(servicos);

    const inicioDoDia = new Date(`${dia}T00:00:00-03:00`);
    const fimDoDia = new Date(inicioDoDia.getTime() + 24 * 60 * 60000);

    const [barbearia, agendamentos, bloqueios] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { configuracoes: true },
      }),
      this.prisma.agendamento.findMany({
        where: {
          tenantId,
          profissionalId,
          status: { in: ['agendado', 'confirmado'] },
          data: { gte: inicioDoDia, lt: fimDoDia },
        },
        select: { data: true, servicos: { select: { qtdeSlots: true } } },
      }),
      // O recorte do dia é feito AQUI, com o fuso de Brasília escrito, e não
      // pelo `buscarBloqueios` do repositório: lá o dia é cortado com
      // `setHours` no fuso do processo, que no Render é UTC. O dia "de UTC"
      // termina às 20:59 de Brasília, então folga marcada das 21h em diante
      // ficava invisível — o endpoint oferecia 21:00 e a marcação recusava
      // com "o profissional não está disponível neste horário".
      this.prisma.bloqueio.findMany({
        where: {
          tenantId,
          OR: [{ profissionalId }, { profissionalId: null }],
          inicio: { lt: fimDoDia },
          fim: { gt: inicioDoDia },
        },
        select: { inicio: true, fim: true },
      }),
    ]);

    const ocupados = [
      ...agendamentos.map((a) => {
        const inicio = new Date(a.data);
        return {
          inicio,
          fim: new Date(inicio.getTime() + duracaoEmMinutos(a.servicos) * 60000),
        };
      }),
      ...bloqueios.map((b) => ({ inicio: new Date(b.inicio), fim: new Date(b.fim) })),
    ];

    // O dia da semana sai do fuso de Brasília: às 22h de Brasília o UTC já
    // virou, e o expediente lido seria o do dia seguinte.
    const diaDaSemana = new Date(`${dia}T12:00:00-03:00`).getDay();
    const expediente = expedienteDoDia(barbearia?.configuracoes, diaDaSemana);

    const livres = horariosLivres({
      // Barbearia sem expediente configurado não trava: vale o dia inteiro,
      // igual à criação de agendamento.
      expediente: expediente ?? { aberto: true, abertura: 0, fechamento: 24 },
      dia,
      duracaoMin,
      ocupados,
    });

    return {
      dia,
      profissional: { id: profissional.id, nome: profissional.nome },
      servicos,
      duracaoMin,
      horarios: livres,
      // Uma frase pronta poupa o robô de inventar a formatação — e de errar.
      mensagem: livres.length
        ? `Tenho estes horários no dia ${dia.split('-').reverse().slice(0, 2).join('/')}: ${livres.join(', ')}.`
        : `Não tenho horário livre com ${profissional.nome} nesse dia. Quer que eu veja outro dia?`,
    };
  }
}
