import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ErrorFilter } from './error.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { AuditInterceptor } from './common/audit.interceptor';
import { PrismaService } from './db/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  // FRONTEND_URL aceita várias origens separadas por vírgula
  // (ex.: produção + previews da Vercel)
  const origens = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const corsOptions = {
    origin: origens.length === 1 ? origens[0] : origens,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  // rawBody habilita a validação de assinatura do webhook do Stripe
  const app = await NestFactory.create(AppModule, { cors: corsOptions, rawBody: true });
  
  // Security headers
  app.use(helmet());

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.useGlobalFilters(new ErrorFilter());
  const prisma = app.get(PrismaService);
  app.useGlobalInterceptors(new LoggingInterceptor(), new AuditInterceptor(prisma));
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
}
bootstrap();
