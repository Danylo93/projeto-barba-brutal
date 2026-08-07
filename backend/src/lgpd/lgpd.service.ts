import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { tipoValido, VERSAO_PRIVACIDADE, VERSAO_TERMOS } from './versoes';

export interface OrigemDaRequisicao {
  ip?: string | null;
  userAgent?: string | null;
}

export interface RegistroDeConsentimento {
  tipo: string;
  aceito: boolean;
  versao?: string;
}

export interface TitularIdentificado {
  titularTipo: 'tenant' | 'usuario' | 'visitante';
  titularId?: number | null;
  tenantId?: number | null;
  visitanteId?: string | null;
}

/**
 * Serviço da LGPD: registra a prova de consentimento, entrega os dados do
 * titular para portabilidade e recebe pedidos de exclusão.
 *
 * Papéis neste produto (importante para saber quem responde pelo quê):
 * - O SaaS é **controlador** dos dados de cadastro das barbearias.
 * - A barbearia é **controladora** dos dados dos clientes dela; o SaaS atua
 *   como **operador**, tratando esses dados por conta e ordem dela.
 */
@Injectable()
export class LgpdService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------- consentimento ------------------------- */

  /** Grava um lote de consentimentos com a prova (versão, data, IP, navegador). */
  async registrar(
    titular: TitularIdentificado,
    consentimentos: RegistroDeConsentimento[],
    origem: OrigemDaRequisicao = {},
  ) {
    if (!Array.isArray(consentimentos) || consentimentos.length === 0) {
      throw new BadRequestException('Informe ao menos um consentimento.');
    }
    if (consentimentos.length > 10) {
      throw new BadRequestException('Consentimentos demais em uma só chamada.');
    }
    if (!titular.titularId && !titular.visitanteId) {
      throw new BadRequestException(
        'É preciso identificar o titular ou o visitante.',
      );
    }

    const dados = consentimentos.map((c) => {
      if (!tipoValido(c.tipo)) {
        throw new BadRequestException(`Tipo de consentimento inválido: ${c.tipo}`);
      }
      return {
        titularTipo: titular.titularTipo,
        titularId: titular.titularId ?? null,
        tenantId: titular.tenantId ?? null,
        tipo: c.tipo,
        versao: c.versao || this.versaoPadrao(c.tipo),
        aceito: !!c.aceito,
        visitanteId: titular.visitanteId ?? null,
        // O IP é dado pessoal: guardamos só porque é a prova do consentimento
        // exigida pelo art. 8º, §1º, e o registro fica restrito a essa tabela.
        ip: origem.ip?.slice(0, 45) ?? null,
        userAgent: origem.userAgent?.slice(0, 300) ?? null,
      };
    });

    await this.prisma.consentimentoLgpd.createMany({ data: dados });
    return { registrados: dados.length };
  }

  private versaoPadrao(tipo: string) {
    if (tipo === 'termos_de_uso') return VERSAO_TERMOS;
    if (tipo === 'politica_privacidade') return VERSAO_PRIVACIDADE;
    return VERSAO_PRIVACIDADE;
  }

  /** Histórico de consentimentos do titular — ele tem direito de consultar. */
  listarConsentimentos(titularTipo: string, titularId: number) {
    return this.prisma.consentimentoLgpd.findMany({
      where: { titularTipo, titularId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tipo: true,
        versao: true,
        aceito: true,
        createdAt: true,
      },
      take: 200,
    });
  }

  /* -------------------------- portabilidade ------------------------- */

  /**
   * Tudo que guardamos sobre o titular, em formato legível (art. 18, V).
   * Nunca inclui hash de senha — o titular não precisa dele e expor
   * enfraquece a segurança da conta.
   */
  async exportarDadosDoUsuario(usuarioId: number, tenantId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, tenantId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        barbeiro: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, nome: true } },
      },
    });
    if (!usuario) throw new NotFoundException('Titular não encontrado.');

    const [agendamentos, assinaturas, consentimentos] = await Promise.all([
      this.prisma.agendamento.findMany({
        where: { usuarioId, tenantId },
        orderBy: { data: 'desc' },
        select: {
          id: true,
          data: true,
          status: true,
          observacoes: true,
          createdAt: true,
          // O que foi cobrado de verdade, e não o preço da tabela de hoje.
          valorTotal: true,
          profissional: { select: { nome: true } },
          servicos: { select: { nome: true } },
        },
      }),
      this.prisma.assinaturaClube.findMany({
        where: { usuarioId, tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          valor: true,
          inicio: true,
          fim: true,
          createdAt: true,
          plano: { select: { nome: true } },
        },
      }),
      this.listarConsentimentos('usuario', usuarioId),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      aviso:
        'Estes são todos os dados pessoais que o sistema guarda sobre você. ' +
        'A barbearia é a controladora destes dados; o Barbearia Brutal os trata como operador.',
      controlador: usuario.tenant,
      titular: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        ehBarbeiro: usuario.barbeiro,
        contaAtiva: usuario.ativo,
        cadastradoEm: usuario.createdAt,
        atualizadoEm: usuario.updatedAt,
      },
      agendamentos,
      assinaturasDoClube: assinaturas,
      consentimentos,
    };
  }

  /** Mesma coisa para a barbearia, que é titular dos próprios dados de cadastro. */
  async exportarDadosDoTenant(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        endereco: true,
        cnpj: true,
        dominio: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!tenant) throw new NotFoundException('Barbearia não encontrada.');

    const [usuarios, agendamentos, consentimentos] = await Promise.all([
      this.prisma.usuario.count({ where: { tenantId } }),
      this.prisma.agendamento.count({ where: { tenantId } }),
      this.listarConsentimentos('tenant', tenantId),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      aviso:
        'Dados de cadastro da barbearia. Os dados dos seus clientes não entram ' +
        'aqui: você é a controladora deles e pode exportá-los pelo painel.',
      barbearia: tenant,
      resumo: { clientesCadastrados: usuarios, agendamentos },
      consentimentos,
    };
  }

  /* ---------------------------- exclusão ---------------------------- */

  /**
   * Registra o pedido de exclusão (art. 18, VI). Não apaga na hora de
   * propósito: agendamento e pagamento têm guarda legal e a exclusão
   * imediata destruiria o histórico da barbearia. O pedido fica pendente
   * para o controlador atender.
   */
  async solicitarExclusao(
    titular: { titularTipo: 'tenant' | 'usuario'; titularId: number; tenantId?: number | null; email: string },
    motivo?: string,
  ) {
    const jaPedido = await this.prisma.solicitacaoExclusao.findFirst({
      where: {
        titularTipo: titular.titularTipo,
        titularId: titular.titularId,
        status: 'pendente',
      },
      select: { id: true, createdAt: true },
    });
    if (jaPedido) {
      throw new BadRequestException(
        'Você já tem um pedido de exclusão em análise.',
      );
    }

    return this.prisma.solicitacaoExclusao.create({
      data: {
        titularTipo: titular.titularTipo,
        titularId: titular.titularId,
        tenantId: titular.tenantId ?? null,
        email: titular.email,
        motivo: motivo?.trim()?.slice(0, 500) || null,
      },
    });
  }

  listarSolicitacoes(tenantId: number, status?: string) {
    return this.prisma.solicitacaoExclusao.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Atende o pedido anonimizando o titular em vez de apagar a linha: o
   * histórico de atendimento da barbearia continua íntegro, mas deixa de
   * ter dado pessoal. É o caminho que concilia o art. 18, VI com a guarda
   * de registros do art. 16.
   */
  async concluirExclusao(tenantId: number, solicitacaoId: number) {
    const pedido = await this.prisma.solicitacaoExclusao.findFirst({
      where: { id: solicitacaoId, tenantId, status: 'pendente' },
    });
    if (!pedido) throw new NotFoundException('Solicitação não encontrada.');
    if (pedido.titularTipo !== 'usuario') {
      throw new BadRequestException(
        'Exclusão de barbearia é tratada pelo suporte do Barbearia Brutal.',
      );
    }

    const anonimo = `anonimizado+${pedido.titularId}@barbabrutal.invalid`;
    await this.prisma.$transaction([
      this.prisma.usuario.updateMany({
        where: { id: pedido.titularId, tenantId },
        data: {
          nome: 'Titular removido',
          email: anonimo,
          telefone: '',
          ativo: false,
          senha: '',
        },
      }),
      this.prisma.solicitacaoExclusao.update({
        where: { id: solicitacaoId },
        data: {
          status: 'concluida',
          atendidoEm: new Date(),
          observacao:
            'Dados pessoais anonimizados; histórico de atendimento preservado sem identificação.',
        },
      }),
    ]);

    return { ok: true };
  }
}
