import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { QueryContextService } from './query-context.service';

/**
 * Har bir so'rov uchun bo'sh SQL-hisob kontekstini ochadi. Kontekst shu yerda
 * `als.run` bilan ochilgani uchun keyingi barcha bosqichlar (guard, interceptor,
 * handler, service, repository) bir xil store'ni ko'radi.
 */
@Injectable()
export class QueryContextMiddleware implements NestMiddleware {
  constructor(private readonly queryContext: QueryContextService) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.queryContext.run(() => next());
  }
}
