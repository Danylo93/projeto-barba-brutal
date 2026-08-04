import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;

    // Auditar apenas escrita
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: async () => {
          if (!shouldAudit) return;
          try {
            const user = req.user;
            const tenant = req.tenant;
            const url: string = req.originalUrl || req.url;
            const entity = (url.split('?')[0] || '').split('/')[1] || 'unknown';
            const entityId = req.params?.id ? Number(req.params.id) : null;
            const metadata = {
              path: url,
              durationMs: Date.now() - started,
            } as any;

            // Usa SQL para evitar depender de client gerado. A coluna metadata é
            // jsonb; o Prisma envia o parâmetro como text, então o cast é quem
            // garante que o Postgres aceite (sem ele: 42804 no ar).
            await this.prisma.$executeRawUnsafe(
              `INSERT INTO "audit_log" ("tenantId","userId","action","entity","entityId","metadata","createdAt")
               VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
              tenant?.id || user?.tenantId || null,
              user?.id || null,
              method,
              entity,
              entityId,
              JSON.stringify(metadata),
              new Date()
            );
          } catch (e) {
            // Auditoria não pode derrubar a requisição — mas também não pode
            // sumir. Se a trilha parar de gravar, ninguém descobria: é
            // exatamente ela que se consulta depois de um incidente.
            this.logger.error(
              `Falha ao gravar auditoria de ${method} ${req.originalUrl || req.url}: ` +
                `${e instanceof Error ? e.message : e}`,
            );
          }
        },
      })
    );
  }
}

