import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';

/**
 * Har bir so'rov uchun bo'sh tenant kontekstini ochadi. Kontekst shu yerda
 * `als.run` bilan ochilgani uchun keyingi barcha bosqichlar (guard, interceptor,
 * handler, service) bir xil store'ni ko'radi va to'ldira oladi.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenant: TenantContextService) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.tenant.run(() => next());
  }
}
