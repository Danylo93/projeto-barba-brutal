import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (user.tipo !== 'tenant' && user.tipo !== 'admin') {
      throw new ForbiddenException('Acesso negado - apenas tenants e admins');
    }

    // Populate request.tenant for use in @CurrentTenant() decorator
    request.tenant = user;

    return true;
  }
}
