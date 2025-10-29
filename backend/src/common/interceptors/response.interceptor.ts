/**
 * Interceptador de Resposta
 * Padroniza todas as respostas da API
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => {
        const response: ApiResponse = {
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
          path: path,
        };

        return response;
      })
    );
  }
}

