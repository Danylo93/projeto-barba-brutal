import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURES_KEY } from './feature.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true; // nenhuma feature exigida
    }

    const request = context.switchToHttp().getRequest();
    const plano = request?.plano as { features?: string[] } | undefined;

    if (!plano?.features || plano.features.length === 0) {
      throw new ForbiddenException('Plano sem features disponíveis para este recurso');
    }

    const hasAll = required.every((req) =>
      plano.features!.some((f) => f.toLowerCase().includes(req.toLowerCase())),
    );

    if (!hasAll) {
      throw new ForbiddenException('Seu plano não possui acesso a este recurso');
    }

    return true;
  }
}

