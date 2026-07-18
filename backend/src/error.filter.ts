import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(Error)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status = (exception as any).getStatus
      ? (exception as any).getStatus()
      : 500;

    console.error(exception);

    const isProduction = process.env.NODE_ENV === 'production';
    const message = (status === 500 && isProduction) 
      ? 'Internal server error' 
      : (exception instanceof Error ? exception.message : exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
