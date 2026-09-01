import { Injectable, Logger as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Logger as TypeOrmLogger } from 'typeorm';
import {
  MetricsService,
  type DbOperation,
} from '../../modules/observability/metrics.service';
import { DbHealthCollector } from './db-health/db-health.collector';
import { QueryContextService } from './query-context.service';

/** SQL matnining boshidan operatsiya turini aniqlaydi (metrika yorlig'i uchun). */
const detectOperation = (query: string): DbOperation => {
  const head = query.trimStart().slice(0, 6).toLowerCase();
  if (head.startsWith('select')) return 'select';
  if (head.startsWith('insert')) return 'insert';
  if (head.startsWith('update')) return 'update';
  if (head.startsWith('delete')) return 'delete';
  return 'other';
};

/** Log satrini o'qiladigan uzunlikda ushlab turadi. */
const truncate = (query: string, max = 500): string =>
  query.length > max ? `${query.slice(0, max)}…` : query;

/**
 * TypeORM so'rovlarini metrikaga ulaydigan logger
 * (docs/postgres-senior-plan.md, 1.3-band).
 *
 * Ikki manba, ikki vazifa:
 *
 * - `logQuery` — **har bir** SQL so'rovda chaqiriladi (TypeORM `logging: ['query']`
 *   bilan). Bu yerda hech nima konsolga yozilmaydi, faqat so'rov sanaladi —
 *   N+1 detektorining butun mohiyati shu hisobda.
 * - `logQuerySlow` — TypeORM `maxQueryExecutionTime` dan uzun so'rovlarda
 *   chaqiriladi va **davomiylikni beradi**. TypeORM logger interfeysi oddiy
 *   so'rovlar uchun vaqt bermaydi, shuning uchun davomiylik histogrammasi
 *   faqat shu chegaradan yuqori so'rovlarni qamraydi. To'liq davomiylik
 *   taqsimoti PostgreSQL tomonidan olinadi: `pg_stat_statements` va
 *   `log_min_duration_statement` (1.1 va 1.2-bandlar).
 */
@Injectable()
export class QueryMetricsLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('SQL');
  /** `TYPEORM_LOGGING=true` — har bir so'rovni konsolga ham chiqarish (faqat dev). */
  private readonly verbose: boolean;

  constructor(
    private readonly queryContext: QueryContextService,
    private readonly metrics: MetricsService,
    // Sog'liq chirog'i `MetricsService` dan MUSTAQIL sanaydi: metrikalar
    // `METRICS_ENABLED=false` bilan o'chirilganda chiroq doim yashil bo'lib
    // yolg'on gapirardi.
    private readonly dbHealth: DbHealthCollector,
    configService: ConfigService,
  ) {
    this.verbose = configService.get<boolean>('database.logging') ?? false;
  }

  logQuery(query: string, parameters?: unknown[]): void {
    this.queryContext.recordQuery();
    if (this.verbose) {
      this.logger.debug(
        `${truncate(query)}${parameters?.length ? ` — ${JSON.stringify(parameters)}` : ''}`,
      );
    }
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    this.queryContext.recordSlowQuery(time);
    this.metrics.observeSlowQuery(detectOperation(query), time / 1000);
    this.dbHealth.recordSlowQuery();
    this.logger.warn(
      `Sekin so'rov (${time} ms): ${truncate(query)}${
        parameters?.length ? ` — parametrlar: ${JSON.stringify(parameters)}` : ''
      }`,
    );
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
    this.metrics.incQueryError(detectOperation(query));
    this.dbHealth.recordQueryError();
    const message = error instanceof Error ? error.message : error;
    this.logger.error(
      `So'rov xatosi: ${message} — ${truncate(query)}${
        parameters?.length ? ` — parametrlar: ${JSON.stringify(parameters)}` : ''
      }`,
    );
  }

  logSchemaBuild(message: string): void {
    this.logger.log(message);
  }

  logMigration(message: string): void {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    const text = typeof message === 'string' ? message : JSON.stringify(message);
    if (level === 'warn') {
      this.logger.warn(text);
      return;
    }
    this.logger.log(text);
  }
}
