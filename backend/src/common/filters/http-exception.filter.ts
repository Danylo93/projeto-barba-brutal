/**
 * Filtro de Exceção HTTP
 * Padroniza o tratamento de erros
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'Erro interno do servidor';
    let errorDetails: any = undefined;

    // Tratamento de erros específicos
    if (status === HttpStatus.BAD_REQUEST) {
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Dados inválidos';

      if (exceptionResponse instanceof Object && 'message' in exceptionResponse) {
        const messages = (exceptionResponse as any).message;
        errorDetails = Array.isArray(messages) ? messages : [messages];
      }
    } else if (status === HttpStatus.UNAUTHORIZED) {
      errorCode = 'UNAUTHORIZED';
      errorMessage = 'Não autenticado';
    } else if (status === HttpStatus.FORBIDDEN) {
      errorCode = 'FORBIDDEN';
      errorMessage = 'Acesso negado';
    } else if (status === HttpStatus.NOT_FOUND) {
      errorCode = 'NOT_FOUND';
      errorMessage = 'Recurso não encontrado';
    } else if (status === HttpStatus.CONFLICT) {
      errorCode = 'CONFLICT';
      errorMessage = 'Conflito nos dados';
    } else if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Dados inválidos';
    } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
      errorCode = 'RATE_LIMIT';
      errorMessage = 'Muitas requisições. Tente novamente mais tarde.';
    } else if (status >= 500) {
      errorCode = 'SERVER_ERROR';
      errorMessage = 'Erro no servidor';
    }

    // Usar mensagem customizada se disponível
    if (exceptionResponse instanceof Object && 'message' in exceptionResponse) {
      const msg = (exceptionResponse as any).message;
      if (typeof msg === 'string' && msg !== 'Forbidden resource') {
        errorMessage = msg;
      }
    }

    const apiResponse: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(apiResponse);
  }
}

