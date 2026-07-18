import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

export const CurrentPlano = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.plano;
  },
);

/**
 * Retorna o tenantId efetivo do usuário autenticado, independente do tipo:
 * - tenant (dono): o próprio id
 * - usuario (barbeiro/cliente): o tenantId ao qual pertence
 * - admin: undefined (não pertence a um único tenant)
 * Usado em endpoints de leitura compartilhados (ex.: agendamento do cliente).
 */
export const CurrentTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return undefined;
    return user.tipo === 'tenant' ? user.id : user.tenantId;
  },
);
