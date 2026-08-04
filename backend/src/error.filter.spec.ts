import { BadRequestException, HttpException } from '@nestjs/common';
import { ErrorFilter } from './error.filter';

/**
 * Trava o vazamento de código-fonte na resposta de erro.
 *
 * As mensagens de erro do Prisma trazem caminho do arquivo, número da linha e
 * um trecho do código. Elas viravam corpo de resposta em qualquer ambiente
 * cujo NODE_ENV não fosse exatamente 'production' — inclusive um deploy em que
 * a variável simplesmente faltasse.
 */
const MENSAGEM_DO_PRISMA =
  'Invalid `this.prisma.usuario.findUnique()` invocation in ' +
  '/home/user/projeto-barba-brutal/backend/src/auth/auth.service.ts:115:47';

function responder(exception: Error) {
  let corpo: any;
  let statusRecebido = 0;
  const host: any = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/auth/usuario/login' }),
      getResponse: () => ({
        status(s: number) {
          statusRecebido = s;
          return this;
        },
        json(c: any) {
          corpo = c;
        },
      }),
    }),
  };
  new ErrorFilter().catch(exception, host);
  return { status: statusRecebido, corpo };
}

const ambienteOriginal = process.env.NODE_ENV;
let erroDoConsole: jest.SpyInstance;

beforeEach(() => {
  // O filtro registra o erro no servidor; não queremos o ruído no teste.
  erroDoConsole = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  erroDoConsole.mockRestore();
  process.env.NODE_ENV = ambienteOriginal;
});

describe('ErrorFilter', () => {
  it('esconde o detalhe do 500 em produção', () => {
    process.env.NODE_ENV = 'production';
    const { status, corpo } = responder(new Error(MENSAGEM_DO_PRISMA));
    expect(status).toBe(500);
    expect(corpo.message).not.toContain('prisma');
    expect(corpo.message).not.toContain('auth.service.ts');
  });

  // O caso que realmente machuca: variável de ambiente esquecida no deploy.
  it('esconde também quando NODE_ENV não está definido', () => {
    delete process.env.NODE_ENV;
    const { corpo } = responder(new Error(MENSAGEM_DO_PRISMA));
    expect(corpo.message).not.toContain('auth.service.ts');
  });

  it('esconde em qualquer ambiente que não seja development', () => {
    for (const ambiente of ['staging', 'test', 'homolog', '']) {
      process.env.NODE_ENV = ambiente;
      expect(responder(new Error(MENSAGEM_DO_PRISMA)).corpo.message).not.toContain(
        'auth.service.ts',
      );
    }
  });

  it('em desenvolvimento mostra o detalhe, que é para isso que serve', () => {
    process.env.NODE_ENV = 'development';
    expect(responder(new Error(MENSAGEM_DO_PRISMA)).corpo.message).toContain('auth.service.ts');
  });

  // 4xx são mensagens escritas para o usuário ler — essas passam sempre.
  it('não mexe na mensagem de erro tratado', () => {
    process.env.NODE_ENV = 'production';
    const { status, corpo } = responder(new HttpException('Credenciais inválidas', 401));
    expect(status).toBe(401);
    expect(corpo.message).toBe('Credenciais inválidas');
  });

  // O ValidationPipe põe as mensagens no CORPO da exceção; o `.message` dela é
  // sempre o texto fixo "Bad Request Exception". Ler só o `.message` apagava a
  // validação da API inteira, e o front não tinha o que mostrar no toast.
  it('entrega a mensagem de validação, não "Bad Request Exception"', () => {
    process.env.NODE_ENV = 'production';
    const daValidacao = new BadRequestException({
      statusCode: 400,
      message: ['Informe um e-mail válido.', 'Informe a senha.'],
      error: 'Bad Request',
    });
    const { status, corpo } = responder(daValidacao);
    expect(status).toBe(400);
    expect(corpo.message).toBe('Informe um e-mail válido.');
  });

  it('aceita mensagem única no corpo da exceção', () => {
    process.env.NODE_ENV = 'production';
    const { corpo } = responder(new BadRequestException('Escolha outro horário.'));
    expect(corpo.message).toBe('Escolha outro horário.');
  });

  it('devolve o caminho e o horário para o suporte se localizar', () => {
    process.env.NODE_ENV = 'production';
    const { corpo } = responder(new Error('qualquer coisa'));
    expect(corpo.path).toBe('/auth/usuario/login');
    expect(corpo.timestamp).toEqual(expect.any(String));
  });
});
