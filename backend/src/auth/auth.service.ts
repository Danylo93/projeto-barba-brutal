import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';
import { SubscriptionValidationService } from '../common/services/subscription-validation.service';
import { escolherCorMarca, COR_PRIMARIA_PADRAO } from '../tenant/cores-marca';
import { limparDocumento, tipoDoDocumento } from '../common/documento';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { emailBoasVindas } from '../notificacao/templates';
import { paraCriar, servicosQueFaltam } from '../servico/catalogo-padrao';
import * as bcrypt from 'bcrypt';
import { novaSessao } from './sessao';
import { slugDisponivel, normalizarSlug, problemaDoSlug, problemaAntesDeNormalizar } from '../tenant/slug';

/** Valida formato de e-mail. */
function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Gera um slug a partir de uma string (ex: "Barbearia do Zé" -> "barbearia-do-ze")
 */
function slugify(texto: string): string {
  return texto
    .toString()
    .normalize('NFD') // separa acentos
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // espaços por hifens
    .replace(/[^\w-]+/g, '') // remove caracteres não alfanuméricos
    .replace(/--+/g, '-'); // remove hifens duplos
}

/**
 * Valida telefone brasileiro (WhatsApp).
 * Aceita somente dígitos, com DDD (2 dígitos) + número (8 ou 9 dígitos) = 10 ou 11 dígitos.
 */
function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '');
  return numeros.length === 10 || numeros.length === 11;
}

/** Remove o campo `senha` de um objeto (shallow), evitando vazar o hash em respostas. */
function semSenha<T extends { senha?: any } | null | undefined>(obj: T): T {
  if (!obj) return obj;
  const { senha, ...rest } = obj as any;
  return rest;
}

/**
 * O que a tela precisa saber da barbearia depois do login.
 *
 * Lista fechada, e não "tudo menos a senha": o registro do tenant guarda a
 * `apiKey` de integração, o CPF/CNPJ do dono, a chave Pix que recebe o clube e
 * o id de cliente no Stripe. Nada disso tem uso no navegador, e tudo isso ia
 * no corpo da resposta de login — legível por qualquer script na página.
 */
function dadosDaBarbearia(tenant: any) {
  if (!tenant) return tenant;
  return {
    id: tenant.id,
    nome: tenant.nome,
    email: tenant.email,
    telefone: tenant.telefone,
    endereco: tenant.endereco,
    dominio: tenant.dominio,
    logo: tenant.logo,
    corPrimaria: tenant.corPrimaria,
    corSecundaria: tenant.corSecundaria,
    configuracoes: tenant.configuracoes,
    ativo: tenant.ativo,
    assinatura: tenant.assinatura
      ? {
          status: tenant.assinatura.status,
          emTeste: tenant.assinatura.emTeste,
          dataFim: tenant.assinatura.dataFim,
          plano: tenant.assinatura.plano
            ? { nome: tenant.assinatura.plano.nome, ativo: tenant.assinatura.plano.ativo }
            : null,
        }
      : null,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private subscriptionValidation: SubscriptionValidationService,
    private notificacao: NotificacaoService,
  ) {}

  /**
   * Descobre o papel e autentica numa requisição só.
   *
   * A tela fazia isso tentando até três endpoints em sequência: cada tentativa
   * era uma ida e volta inteira (navegador → função da Vercel → API no Render
   * → banco), e um login errado custava três delas. O servidor já tem tudo em
   * mãos para decidir.
   *
   * A separação de contexto é a mesma de antes: com `tenantId` (página da
   * barbearia) entram cliente e profissional; sem ele (painel do SaaS) entram
   * dono e admin. Quem erra a página recebe `contextoErrado` para a tela
   * orientar, em vez de só "senha inválida".
   */
  async login(email: string, senha: string, tenantId?: number) {
    const tentar = async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch {
        // Aqui só interessa "essa credencial serve neste contexto?". O erro
        // que vale mostrar é decidido no fim, com o contexto todo conhecido.
        return null;
      }
    };

    if (tenantId) {
      const usuario = await tentar(() => this.loginUsuario(email, senha, tenantId));
      if (usuario) return { ...usuario, papel: 'usuario' };

      // O dono da barbearia tentou entrar pela URL do próprio subdomínio
      const dono = await tentar(() => this.loginTenant(email, senha));
      if (dono && dono.tenant.id === tenantId) {
        return { ...dono, papel: 'tenant' };
      }

      // Sonda sem autenticar: chamar `loginAdmin` aqui geraria uma sessão
      // nova e derrubaria o admin que estivesse logado no painel.
      if (await this.ehCredencialDeAdministracao(email, senha)) {
        return {
          contextoErrado: 'administracao',
          message:
            'Esta é uma conta de dono ou administrador de outro contexto. Entre pelo painel correto.',
        };
      }
      // Repete a tentativa só para devolver a mensagem exata (assinatura
      // vencida, barbearia inativa) em vez de um "senha inválida" genérico.
      return this.loginUsuario(email, senha, tenantId);
    }

    const dono = await tentar(() => this.loginTenant(email, senha));
    if (dono) return { ...dono, papel: 'tenant' };

    const admin = await tentar(() => this.loginAdmin(email, senha));
    if (admin) return { ...admin, papel: 'admin' };

    // Cliente ou barbeiro tentando entrar pelo painel do SaaS. Só chega aqui
    // quem acertou a senha, então não conta nada a quem não sabia — e evita o
    // "email ou senha inválidos" para quem digitou tudo certo, só na página
    // errada.
    const daBarbearia = await this.barbeariaDoCliente(email, senha);
    if (daBarbearia) {
      return {
        contextoErrado: 'cliente',
        message:
          `Esta conta é de cliente ou profissional da ${daBarbearia.nome}. ` +
          `Para entrar e agendar, use a página da sua barbearia.`,
        tenantId: daBarbearia.id,
      };
    }

    return this.loginTenant(email, senha);
  }

  /**
   * Achou uma conta de cliente/barbeiro com essa senha? Devolve a barbearia
   * dela, só para a tela poder mandar a pessoa para o lugar certo.
   */
  private async barbeariaDoCliente(email: string, senha: string) {
    const candidatos = await this.prisma.usuario.findMany({
      where: { email, ativo: true },
      select: { senha: true, tenant: { select: { id: true, nome: true } } },
      take: 5,
    });

    for (const candidato of candidatos) {
      if (await bcrypt.compare(senha, candidato.senha)) return candidato.tenant;
    }
    return null;
  }

  /**
   * A credencial é de dono ou de admin? Confere e pronto — não emite token
   * nem mexe na sessão de ninguém.
   */
  private async ehCredencialDeAdministracao(
    email: string,
    senha: string,
  ): Promise<boolean> {
    const [tenant, admin] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { email },
        select: { senha: true, ativo: true },
      }),
      this.prisma.admin.findUnique({
        where: { email },
        select: { senha: true, ativo: true },
      }),
    ]);

    if (tenant?.ativo && (await bcrypt.compare(senha, tenant.senha || ''))) {
      return true;
    }
    if (admin?.ativo && (await bcrypt.compare(senha, admin.senha))) {
      return true;
    }
    return false;
  }

  async loginTenant(email: string, senha: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
      include: {
        assinatura: {
          include: {
            plano: true,
          },
        },
      },
    });

    // Identidade primeiro, permissão depois — e "Credenciais inválidas" só
    // para o que É credencial inválida.
    //
    // Antes, barbearia suspensa pelo admin caía aqui com essa mesma frase: o
    // dono ficava digitando a senha certa achando que tinha esquecido, e não
    // havia caminho nenhum de volta. E logo abaixo, quem ainda não tinha
    // escolhido plano levava um 400 — ou seja, quem se cadastrava pelo anúncio
    // e fechava a aba antes de escolher o plano perdia a conta que acabara de
    // criar.
    //
    // Entrar é o começo de voltar a pagar. O que a pessoa pode FAZER lá dentro
    // é com o SubscriptionGuard, que rebaixa para o plano de entrada e deixa a
    // tela oferecer o plano.
    if (!tenant) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, tenant.senha || '');
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const assinatura = tenant.assinatura;
    const sid = novaSessao();
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { sessaoId: sid },
    });

    const payload = {
      id: tenant.id,
      tenantId: tenant.id,
      tipo: 'tenant',
      email: tenant.email,
      sid,
    };

    return {
      access_token: this.jwtService.sign(payload),
      // Só o que a tela usa. Devolver o tenant inteiro mandava para o
      // navegador a apiKey de integração, o CPF/CNPJ e a chave Pix da
      // barbearia — tudo no corpo da resposta de login.
      tenant: dadosDaBarbearia(tenant),
    };
  }

  async loginUsuario(email: string, senha: string, tenantId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        email_tenantId: {
          email,
          tenantId,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            nome: true,
            ativo: true,
            assinatura: {
              select: {
                status: true,
                dataFim: true,
                emTeste: true,
                plano: {
                  select: { nome: true, ativo: true },
                },
              },
            },
          },
        },
        profissional: {
          select: { id: true, nome: true },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!usuario.tenant?.ativo) {
      throw new UnauthorizedException(
        'Esta barbearia está indisponível no momento. Fale com a barbearia.',
      );
    }

    // Valida assinatura usando os dados já carregados
    const assinatura = usuario.tenant.assinatura
    if (!assinatura) {
      throw new BadRequestException(
        'Sua barbearia não possui um plano ativo. Por favor, adquira um plano para continuar.',
      )
    }
    if (assinatura.status !== 'active' && assinatura.status !== 'trialing') {
      throw new BadRequestException(
        `Sua assinatura está com status "${assinatura.status}". Por favor, regularize sua situação para continuar.`,
      )
    }
    if (assinatura.dataFim < new Date()) {
      throw new BadRequestException(
        'Sua assinatura expirou. Por favor, renove seu plano para continuar.',
      )
    }
    if (!assinatura.plano.ativo) {
      throw new BadRequestException(
        'O plano associado à sua assinatura não está mais disponível.',
      )
    }

    const sid = novaSessao();
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { sessaoId: sid },
    });

    const payload = {
      id: usuario.id,
      tenantId: usuario.tenantId,
      tipo: 'usuario',
      email: usuario.email,
      barbeiro: usuario.barbeiro,
      profissionalId: usuario.profissional?.id,
      sid,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        barbeiro: usuario.barbeiro,
        tenantId: usuario.tenantId,
        tenant: usuario.tenant,
        profissional: usuario.profissional,
      },
    };
  }

  async loginAdmin(email: string, senha: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const sid = novaSessao();
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { sessaoId: sid },
    });

    const payload = {
      id: admin.id,
      tipo: 'admin',
      email: admin.email,
      sid,
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin: semSenha(admin),
    };
  }

  async registerTenant(data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    endereco?: string;
    documento: string;
    dominio?: string;
  }) {
    if (!validarEmail(data.email)) {
      throw new BadRequestException('E-mail inválido. Informe um e-mail válido (ex: nome@email.com)');
    }
    if (!validarTelefone(data.telefone)) {
      throw new BadRequestException('Telefone inválido. Informe o DDD + número (ex: 11999990000)');
    }

    // O documento é o que identifica a barbearia de verdade. E-mail não
    // verificado não identifica ninguém: sem isso, a mesma pessoa abre conta
    // atrás de conta e renova o teste grátis para sempre.
    const documento = limparDocumento(data.documento || '');
    const tipoDocumento = tipoDoDocumento(documento);
    if (!tipoDocumento) {
      throw new BadRequestException(
        'CPF ou CNPJ inválido. Confira os números e tente de novo.',
      );
    }

    const jaCadastrado = await this.prisma.tenant.findUnique({
      where: { documento },
      select: { id: true },
    });
    if (jaCadastrado) {
      throw new BadRequestException(
        'Já existe uma barbearia cadastrada com esse CPF/CNPJ. Entre com a conta existente ou recupere a senha.',
      );
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    // Cada barbearia nova recebe uma cor de marca diferente das já existentes.
    const existentes = await this.prisma.tenant.findMany({
      select: { corSecundaria: true },
    });
    const corSecundaria = escolherCorMarca(
      existentes.map((t) => t.corSecundaria),
      existentes.length,
    );

    // Endereço público da barbearia — vira `latita.barbeariabrutal.com`.
    //
    // Se o dono escolheu um subdomínio no cadastro, valida e usa ele.
    // Senão, gera automaticamente a partir do nome.
    let slug: string;
    if (data.dominio) {
      const problemaBruto = problemaAntesDeNormalizar(data.dominio);
      if (problemaBruto) throw new BadRequestException(problemaBruto);

      const normalizado = normalizarSlug(data.dominio);
      const problema = problemaDoSlug(normalizado);
      if (problema) throw new BadRequestException(problema);

      const ocupado = await this.prisma.tenant.findFirst({
        where: {
          OR: [{ dominio: normalizado }, { dominiosAntigos: { has: normalizado } }],
        },
        select: { id: true },
      });
      if (ocupado) {
        throw new BadRequestException(
          'Este endereço já está em uso. Escolha outro.',
        );
      }
      slug = normalizado;
    } else {
      // Passa pela lista de reservados: antes, "Barbearia WWW" recebia o slug
      // `www` calado, e com o subdomínio no ar isso entregaria
      // www.barbeariabrutal.com para um cliente qualquer.
      slug = await slugDisponivel(data.nome, async (candidato) => {
        const ocupado = await this.prisma.tenant.findFirst({
          where: {
            OR: [{ dominio: candidato }, { dominiosAntigos: { has: candidato } }],
          },
          select: { id: true },
        });
        return !!ocupado;
      });
    }

    // A sessão já nasce com o cadastro: uma consulta a menos, e a conta nunca
    // fica um instante sem `sessaoId` (que reprovaria o token recém-emitido).
    const sid = novaSessao();

    const tenant = await this.prisma.tenant.create({
      data: {
        ...data,
        documento,
        tipoDocumento,
        senha: senhaHash,
        corPrimaria: COR_PRIMARIA_PADRAO,
        corSecundaria,
        dominio: slug,
        sessaoId: sid,
      },
    });

    // A barbearia já nasce com o catálogo de serviços. Sem isto o dono cai
    // num painel vazio e precisa cadastrar tudo antes de qualquer tela
    // funcionar — inclusive a página pública, que ficava sem nada para mostrar.
    await this.prisma.servico.createMany({
      data: servicosQueFaltam([]).map((padrao) => paraCriar(padrao, tenant.id)),
    });

    // Boas-vindas não pode derrubar o cadastro: se o SMTP cair, a barbearia
    // ainda entra no sistema. Por isso o erro só vira log.
    const site = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    this.notificacao.enviarTemplateEmSegundoPlano(
      tenant.email,
      emailBoasVindas({ nomeBarbearia: tenant.nome, urlPlanos: `${site}/planos` }),
    );

    const payload = {
      id: tenant.id,
      tenantId: tenant.id,
      tipo: 'tenant',
      email: tenant.email,
      sid,
    };

    return {
      access_token: this.jwtService.sign(payload),
      tenant: dadosDaBarbearia(tenant),
    };
  }

  async registerUsuario(data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    tenantId: number;
  }) {
    if (!validarEmail(data.email)) {
      throw new BadRequestException('E-mail inválido. Informe um e-mail válido (ex: nome@email.com)');
    }
    if (!validarTelefone(data.telefone)) {
      throw new BadRequestException('Telefone inválido. Informe o DDD + número (ex: 11999990000)');
    }

    // Não permite cadastro de cliente em barbearia inexistente/inativa.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { ativo: true },
    });
    if (!tenant || !tenant.ativo) {
      throw new UnauthorizedException(
        'Esta barbearia está indisponível no momento. Fale com a barbearia.',
      );
    }


    const senhaHash = await bcrypt.hash(data.senha, 10);
    // A sessão já nasce com o cadastro: uma consulta a menos, e a conta nunca
    // fica um instante sem `sessaoId` (que reprovaria o token recém-emitido).
    const sid = novaSessao();

    const usuario = await this.prisma.usuario.create({
      // Campo a campo, nunca `...data`.
      //
      // Com o espalhamento, qualquer um mandava `barbeiro: true` no cadastro
      // público e virava barbeiro da barbearia alheia — o que libera criar
      // agendamento em nome de outro cliente e enxergar a agenda inteira.
      // Barbeiro se cria pelo cadastro de profissional, que exige token do
      // dono; aqui é sempre cliente.
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        senha: senhaHash,
        tenantId: data.tenantId,
        barbeiro: false,
        sessaoId: sid,
      },
      include: {
        tenant: {
          include: {
            assinatura: {
              include: {
                plano: true,
              },
            },
          },
        },
      },
    });

    const payload = {
      id: usuario.id,
      tenantId: usuario.tenantId,
      tipo: 'usuario',
      email: usuario.email,
      barbeiro: usuario.barbeiro,
      sid,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: { ...semSenha(usuario), tenant: semSenha(usuario.tenant) },
    };
  }

}
