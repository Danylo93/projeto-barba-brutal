import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isDev = process.env.NODE_ENV !== 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl: url } = req;
    const user = req.user;
    const tenant = req.tenant;
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          if (this.isDev) {
            const ms = Date.now() - started;
            this.logger.log(
              `${method} ${url} ${ms}ms uid=${user?.id ?? '-'} tenant=${tenant?.id ?? '-'}`,
            );
          }
        },
        error: (err) => {
          const ms = Date.now() - started;
          this.logger.error(
            `${method} ${url} ${ms}ms uid=${user?.id ?? '-'} tenant=${tenant?.id ?? '-'} -> ${err?.message ?? err}`,
          );
        },
      }),
    );
  }
}

