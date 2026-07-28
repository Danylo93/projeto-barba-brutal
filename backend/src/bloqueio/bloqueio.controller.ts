import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BloqueioService, NovoBloqueio } from './bloqueio.service';

/**
 * Bloqueios de agenda (folga, almoço, férias, feriado).
 *
 * - Dono da barbearia: gerencia bloqueios de qualquer profissional (ou da casa toda).
 * - Barbeiro: gerencia apenas os próprios.
 * - Cliente: só leitura, para o agendamento saber o que está indisponível.
 */
@Controller('bloqueios')
@UseGuards(JwtAuthGuard)
export class BloqueioController {
  constructor(private readonly service: BloqueioService) {}

  private tenantIdDe(user: any): number {
    return user?.tipo === 'tenant' ? user.id : user.tenantId;
  }

  @Get()
  listar(
    @CurrentUser() user: any,
    @Query('profissionalId') profissionalId?: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
  ) {
    return this.service.listar(this.tenantIdDe(user), {
      profissionalId: profissionalId ? Number(profissionalId) : undefined,
      de,
      ate,
    });
  }

  @Post()
  async criar(@CurrentUser() user: any, @Body() dados: NovoBloqueio) {
    const tenantId = this.tenantIdDe(user);

    // Barbeiro só bloqueia a própria agenda; o dono escolhe de quem é.
    if (user?.tipo !== 'tenant') {
      const meuProfissionalId = await this.service.profissionalDoUsuario(user.id, tenantId);
      return this.service.criar(tenantId, { ...dados, profissionalId: meuProfissionalId });
    }

    return this.service.criar(tenantId, dados);
  }

  @Delete(':id')
  async remover(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    const tenantId = this.tenantIdDe(user);

    if (user?.tipo !== 'tenant') {
      // Garante que o barbeiro só apague bloqueio dele.
      const meuProfissionalId = await this.service.profissionalDoUsuario(user.id, tenantId);
      const meus = await this.service.listar(tenantId, { profissionalId: meuProfissionalId });
      const ehMeu = meus.some((b) => b.id === id && b.profissionalId === meuProfissionalId);
      if (!ehMeu) {
        return this.service.remover(-1, id); // força 404 sem revelar de quem é
      }
    }

    return this.service.remover(tenantId, id);
  }
}
