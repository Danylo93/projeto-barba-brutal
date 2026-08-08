import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
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
  // A barra final tem que sair: o navegador manda a origem sem ela, então
  // "https://app.vercel.app/" nunca casaria com nada e o CORS quebraria
  // inteiro por causa de um caractere na variável de ambiente.
  const origens = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const corsOptions = {
    origin: origens.length === 1 ? origens[0] : origens,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  // rawBody habilita a validação de assinatura do webhook do Stripe
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: corsOptions,
    rawBody: true,
  });
  
  // Security headers
  app.use(helmet());

  // Sem isto, `req.ip` é o endereço do proxy do Render — o MESMO para todo
  // visitante do planeta. Todos os limites por IP viravam um balde só: cinco
  // agendamentos públicos por minuto no SaaS inteiro, e nenhuma proteção
  // contra robô, que bastava trocar de IP para escapar de um contador que
  // nem estava olhando para ele.
  //
  // `1` e não `true`: confia só no proxy imediatamente à frente. Confiar na
  // cadeia toda deixaria qualquer um forjar o próprio IP no
  // `X-Forwarded-For` e furar o limite à vontade.
  app.set('trust proxy', 1);

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
