import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { testeGratisVigente } from '../assinatura/teste-gratis';

/** O plano de entrada: o que uma barbearia sem assinatura em dia continua tendo. */
const PLANO_DE_ENTRADA = 'Básico';

/**
 * Quem pode usar o sistema, e com qual plano.
 *
 * Este guard já foi uma catraca: assinatura vencida virava 403 em TODA rota da
 * barbearia. O dono não via a agenda de amanhã, não abria a lista de clientes,
 * não conseguia nem olhar o que já tinha cadastrado — e o cliente dele, do
 * outro lado, não conseguia marcar. Quem chega por anúncio, testa e bate nessa
 * parede no dia 31 não vira assinante: some.
 *
 * Agora vencer o plano não fecha a porta, rebaixa: a barbearia volta ao plano
 * de entrada e segue trabalhando com o que ele dá. O que fica de fora é o que
 * se paga para ter — e é isso que a tela de upsell tem para mostrar, em vez de
 * um aviso de acesso suspenso.
 *
 * `request.assinaturaInativa` é o que o frontend lê para decidir se mostra o
 * convite. Ele sai daqui, e não de uma conta de datas repetida na tela: quem
 * decide se a assinatura vale é o backend, sempre.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('Tenant não identificado');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { assinatura: { include: { plano: true } } },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant não encontrado');
    }

    const agora = new Date();
    const assinatura = tenant.assinatura;

    // "active" (paga) e "trialing" (teste) valem; e a data de fim tem que estar
    // no futuro. Qualquer outra combinação é assinatura inativa — o que hoje
    // significa rebaixar, não barrar.
    const emDia =
      !!assinatura &&
      (assinatura.status === 'active' || assinatura.status === 'trialing') &&
      !!assinatura.dataFim &&
      assinatura.dataFim > agora;

    request.tenant = tenant;
    request.assinaturaInativa = !emDia;

    if (emDia) {
      // Durante o teste grátis, qualquer plano escolhido recebe os
      // limites e recursos do Premium. O plano escolhido continua salvo
      // porque é ele que será cobrado se o dono seguir depois do teste.
      request.plano = testeGratisVigente(assinatura, agora)
        ? (await this.planoPorNome('Premium')) ?? assinatura!.plano
        : assinatura!.plano;
      return true;
    }

    // Rebaixado. Sem o plano de entrada cadastrado, segue sem plano: seed
    // faltando é problema nosso, e derrubar o dono por isso seria trocar um
    // erro de configuração por uma barbearia parada.
    request.plano = await this.planoPorNome(PLANO_DE_ENTRADA);
    return true;
  }

  private planoPorNome(nome: string) {
    return this.prisma.plano.findFirst({ where: { nome, ativo: true } });
  }
}
