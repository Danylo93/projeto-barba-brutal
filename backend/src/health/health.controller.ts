import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /**
   * `commit` responde a pergunta que não dava para responder: qual código está
   * no ar AGORA. Sem isso, conferir deploy virava adivinhação — dá para achar
   * que a correção subiu quando ainda está rodando a versão anterior. O Render
   * já injeta `RENDER_GIT_COMMIT`; fora dele fica `desconhecido`, sem inventar.
   */
  @Get()
  async get() {
    const commit = (process.env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || 'desconhecido';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', commit };
    } catch (e) {
      return { status: 'degraded', db: 'down', commit };
    }
  }
}

