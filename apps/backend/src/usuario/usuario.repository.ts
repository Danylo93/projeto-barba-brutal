import { Injectable } from '@nestjs/common';
import { RepositorioUsuario, Usuario } from '@barba/core';
import { PrismaService } from 'src/db/prisma.service';

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

  async buscarPorEmail(email: string): Promise<Usuario> {
    return this.prismaService.usuario.findUnique({
      where: { email },
    });
  }
}
