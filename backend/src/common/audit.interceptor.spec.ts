import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

/**
 * A trilha de auditoria só existe quando há um sujeito (usuário ou tenant).
 * Rotas de sistema — a batida do n8n em /lembretes/confirmacoes/disparar, o
 * webhook do Mercado Pago — não têm nenhum dos dois, e tentar gravar com
 * tenantId null derruba o insert na NOT NULL da tabela (23502). O erro ficava
 * preso no log do Render e ninguém via até o banco encher de quebra.
 */

function interceptar(req: any, prisma: any) {
  const interceptor = new AuditInterceptor(prisma as any);
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;
  const next = { handle: () => of(null) } as any;
  interceptor.intercept(ctx, next).subscribe();
}

describe('AuditInterceptor', () => {
  it('grava auditoria quando a rota tem usuário', () => {
    const insert = jest.fn(async (..._args: any[]) => 1);
    const prisma = { $executeRawUnsafe: insert };
    const req = {
      method: 'POST',
      originalUrl: '/servicos',
      user: { id: 3, tenantId: 7 },
    };

    interceptar(req, prisma);

    expect(insert).toHaveBeenCalledTimes(1);
    const [, tenantId, userId] = insert.mock.calls[0];
    expect(tenantId).toBe(7);
    expect(userId).toBe(3);
  });

  it('não grava em rota de sistema sem usuário nem tenant (n8n)', () => {
    const insert = jest.fn(async (..._args: any[]) => 1);
    const prisma = { $executeRawUnsafe: insert };
    const req = {
      method: 'POST',
      originalUrl: '/lembretes/confirmacoes/disparar',
    };

    interceptar(req, prisma);

    expect(insert).not.toHaveBeenCalled();
  });

  it('não grava em leitura', () => {
    const insert = jest.fn(async (..._args: any[]) => 1);
    const prisma = { $executeRawUnsafe: insert };
    const req = {
      method: 'GET',
      originalUrl: '/servicos',
      user: { id: 3, tenantId: 7 },
    };

    interceptar(req, prisma);

    expect(insert).not.toHaveBeenCalled();
  });
});
