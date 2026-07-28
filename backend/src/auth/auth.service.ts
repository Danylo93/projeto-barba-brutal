import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';
import { SubscriptionValidationService } from '../common/services/subscription-validation.service';
import { escolherCorMarca, COR_PRIMARIA_PADRAO } from '../tenant/cores-marca';
import { limparDocumento, tipoDoDocumento } from '../common/documento';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { NotificacaoService } from '../notificacao/notificacao.service';

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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private subscriptionValidation: SubscriptionValidationService,
    private notificacao: NotificacaoService,
  ) {}

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

    if (!tenant || !tenant.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, tenant.senha || '');
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Valida assinatura usando os dados já carregados
    const assinatura = tenant.assinatura
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

    const payload = {
      id: tenant.id,
      tenantId: tenant.id,
      tipo: 'tenant',
      email: tenant.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      tenant: semSenha(tenant),
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

    const payload = {
      id: usuario.id,
      tenantId: usuario.tenantId,
      tipo: 'usuario',
      email: usuario.email,
      barbeiro: usuario.barbeiro,
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

    const payload = {
      id: admin.id,
      tipo: 'admin',
      email: admin.email,
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

    // Gerar domínio único (slug)
    let baseSlug = slugify(data.nome);
    if (!baseSlug) baseSlug = 'barbearia';
    
    let slug = baseSlug;
    let contador = 1;
    let slugExiste = await this.prisma.tenant.findUnique({
      where: { dominio: slug },
      select: { id: true },
    });

    while (slugExiste) {
      slug = `${baseSlug}-${contador}`;
      contador++;
      slugExiste = await this.prisma.tenant.findUnique({
        where: { dominio: slug },
        select: { id: true },
      });
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        ...data,
        documento,
        tipoDocumento,
        senha: senhaHash,
        corPrimaria: COR_PRIMARIA_PADRAO,
        corSecundaria,
        dominio: slug,
      },
    });

    const payload = {
      id: tenant.id,
      tenantId: tenant.id,
      tipo: 'tenant',
      email: tenant.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      tenant: semSenha(tenant),
    };
  }

  async registerUsuario(data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    barbeiro: boolean;
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

    const usuario = await this.prisma.usuario.create({
      data: {
        ...data,
        senha: senhaHash,
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
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: { ...semSenha(usuario), tenant: semSenha(usuario.tenant) },
    };
  }

  async recuperarSenha(email: string, tenantId?: number) {
    if (!validarEmail(email)) {
      throw new BadRequestException('E-mail inválido.');
    }

    // Tenta encontrar a conta
    let conta: { id: number; nome: string } | null = null
    let tipo: 'tenant' | 'usuario' = 'usuario'

    if (tenantId) {
      const usuario = await this.prisma.usuario.findFirst({
        where: { email, tenantId },
        select: { id: true, nome: true },
      })
      if (usuario) {
        conta = usuario
        tipo = 'usuario'
      }
    } else {
      const tenant = await this.prisma.tenant.findUnique({
        where: { email },
        select: { id: true, nome: true },
      })
      if (tenant) {
        conta = tenant
        tipo = 'tenant'
      }
    }

    // Não revela se a conta existe ou não (segurança)
    if (!conta) {
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' }
    }

    // Remove tokens anteriores desse e-mail
    await this.prisma.tokenRecuperacaoSenha.deleteMany({
      where: { email, usado: false },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiracao = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await this.prisma.tokenRecuperacaoSenha.create({
      data: { email, token, expiracao },
    })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const params = tipo === 'usuario' && tenantId ? `?token=${token}&tenant=${tenantId}` : `?token=${token}`
    const link = `${frontendUrl}/redefinir-senha${params}`

    this.notificacao.enviarEmail(
      email,
      'Recuperação de senha — Barba Brutal',
      `Olá ${conta.nome},\n\nRecebemos um pedido de recuperação de senha.\n\nClique no link abaixo para redefinir sua senha:\n${link}\n\nEste link é válido por 1 hora.\n\nSe não foi você quem pediu, ignore este e-mail.\n\n— Equipe Barba Brutal`,
    ).catch(() => {
      // Falha no e-mail não impede a resposta — o token foi gerado e pode ser
      // reenviado manualmente se necessário.
    })

    return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' }
  }

  async redefinirSenha(token: string, novaSenha: string, tenantId?: number) {
    if (novaSenha.length < 6) {
      throw new BadRequestException('A nova senha deve ter no mínimo 6 caracteres.')
    }

    const registro = await this.prisma.tokenRecuperacaoSenha.findUnique({
      where: { token },
    })

    if (!registro || registro.usado || registro.expiracao < new Date()) {
      throw new BadRequestException('Token inválido ou expirado. Solicite uma nova recuperação de senha.')
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10)

    if (tenantId) {
      await this.prisma.usuario.update({
        where: { email_tenantId: { email: registro.email, tenantId } },
        data: { senha: senhaHash },
      })
    } else {
      const tenant = await this.prisma.tenant.findUnique({
        where: { email: registro.email },
        select: { id: true },
      })

      if (tenant) {
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { senha: senhaHash },
        })
      } else {
        throw new BadRequestException(
          'Token inválido ou expirado. Solicite uma nova recuperação de senha.',
        )
      }
    }

    await this.prisma.tokenRecuperacaoSenha.update({
      where: { id: registro.id },
      data: { usado: true },
    })

    return { message: 'Senha redefinida com sucesso.' }
  }
}
