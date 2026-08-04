import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

/** Mensagem genérica de 500 — nunca conta o que quebrou por dentro. */
const ERRO_INTERNO = 'Erro interno. Tente de novo em instantes.';

/**
 * A mensagem que o usuário vai ler.
 *
 * O `ValidationPipe` monta um BadRequestException cujo `.message` é o texto
 * fixo "Bad Request Exception"; as mensagens de verdade ficam no CORPO da
 * exceção, em `getResponse().message`. Ler só o `.message` apagava toda a
 * validação da API — o front recebia "Bad Request Exception" e não tinha o que
 * mostrar no toast.
 */
function mensagemDaExcecao(exception: Error): unknown {
  if (exception instanceof HttpException) {
    const corpo = exception.getResponse();
    if (typeof corpo === 'string') return corpo;
    const doCorpo = (corpo as { message?: unknown })?.message;
    if (Array.isArray(doCorpo)) {
      // Várias regras quebradas: a primeira é a que o usuário resolve agora.
      return doCorpo[0] ?? exception.message;
    }
    if (doCorpo) return doCorpo;
  }
  return exception.message;
}

@Catch(Error)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    console.error(exception);

    // Detalhe de erro 500 só sai em desenvolvimento DECLARADO. Antes a regra
    // era o contrário — escondia só quando NODE_ENV era exatamente
    // 'production' —, então bastava a variável faltar num deploy para o corpo
    // da resposta devolver caminho de arquivo e trecho do código-fonte (as
    // mensagens do Prisma trazem os dois). Esconder é o padrão seguro.
    const emDesenvolvimento = process.env.NODE_ENV === 'development';
    const message =
      status === 500 && !emDesenvolvimento ? ERRO_INTERNO : mensagemDaExcecao(exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
