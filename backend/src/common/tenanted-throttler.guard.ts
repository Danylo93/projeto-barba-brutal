import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class TenantedThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Prioriza o tenantId; fallback para IP
    const tenantId = req?.tenant?.id || req?.user?.tenantId;
    const ip = req.ips?.length ? req.ips[0] : req.ip;
    return tenantId ? `t:${tenantId}` : `ip:${ip}`;
  }
}

