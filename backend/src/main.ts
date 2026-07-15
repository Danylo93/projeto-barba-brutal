import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ErrorFilter } from './error.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { AuditInterceptor } from './common/audit.interceptor';
import { PrismaService } from './db/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  const app = await NestFactory.create(AppModule, { cors: corsOptions });
  
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
