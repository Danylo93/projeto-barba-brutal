import { Injectable } from '@nestjs/common';
import { RepositorioUsuario, Usuario } from '../types';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class UsuarioRepository implements RepositorioUsuario {
  constructor(private readonly prismaService: PrismaService) {}

  async salvar(usuario: Usuario): Promise<void> {
    await this.prismaService.usuario.upsert({
      where: { id: usuario.id ?? -1 },
      update: usuario as any,
      create: usuario as any,
    });
  }

  /**
   * Busca a conta dentro de UMA barbearia.
   *
   * O tenantId não é enfeite: o mesmo e-mail pode existir em barbearias
   * diferentes (@@unique([email, tenantId])), então busca sem ele devolve a
   * conta errada para quem frequenta duas.
   */
  async buscarNoTenant(id: number, tenantId: number): Promise<Usuario | null> {
    return this.prismaService.usuario.findFirst({
      where: { id, tenantId, ativo: true },
    });
  }

  /**
   * Busca por e-mail DENTRO de uma barbearia.
   *
   * O tenantId é obrigatório de propósito. A versão sem ele existia e resolvia
   * o usuário logado para a barbearia errada.
   */
  async buscarPorEmail(email: string, tenantId: number): Promise<Usuario | null> {
    return this.prismaService.usuario.findFirst({
      where: { email, tenantId },
    });
  }
}
