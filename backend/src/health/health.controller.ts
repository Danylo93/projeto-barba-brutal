import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch (e) {
      return { status: 'degraded', db: 'down' };
    }
  }
}

