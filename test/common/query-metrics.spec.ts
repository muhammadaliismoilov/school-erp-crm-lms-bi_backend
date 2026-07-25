import type { ConfigService } from '@nestjs/config';
import { QueryContextService } from '../../src/common/database/query-context.service';
import { QueryMetricsLogger } from '../../src/common/database/query-metrics.logger';
import type { DbOperation } from '../../src/modules/observability/metrics.service';
import type { MetricsService } from '../../src/modules/observability/metrics.service';

/** `database.logging` ni boshqaradigan minimal ConfigService. */
const configWith = (verbose: boolean): ConfigService =>
  ({ get: () => verbose }) as unknown as ConfigService;

const metricsStub = () => {
  const slow: Array<{ operation: DbOperation; seconds: number }> = [];
  const errors: DbOperation[] = [];
  const perRequest: Array<{ route: string; queryCount: number }> = [];
  const service = {
    observeSlowQuery: (operation: DbOperation, seconds: number) =>
      slow.push({ operation, seconds }),
    incQueryError: (operation: DbOperation) => errors.push(operation),
    observeQueriesPerRequest: (input: { route: string; queryCount: number }) =>
      perRequest.push(input),
  } as unknown as MetricsService;
  return { service, slow, errors, perRequest };
};

describe('QueryContextService', () => {
  it('kontekst tashqarisida stats() null qaytaradi va yiqilmaydi', () => {
    const context = new QueryContextService();

    expect(context.stats()).toBeNull();
    // Kontekstsiz chaqiruv (worker, cron) — jim o'tishi kerak.
    expect(() => context.recordQuery()).not.toThrow();
  });

  it('bitta so‘rov ichidagi SQL so‘rovlarni sanaydi', () => {
    const context = new QueryContextService();

    const stats = context.run(() => {
      context.recordQuery();
      context.recordQuery();
      context.recordQuery();
      context.recordSlowQuery(450);
      return context.stats();
    });

    expect(stats).toEqual({ count: 3, slowCount: 1, slowTotalMs: 450 });
  });

  it('parallel so‘rovlar bir-birining hisobini buzmaydi (izolyatsiya)', async () => {
    const context = new QueryContextService();

    const request = (queries: number) =>
      new Promise<number>((resolve) => {
        void context.run(async () => {
          for (let i = 0; i < queries; i += 1) {
            context.recordQuery();
            // Asinxron chegara — ALS kontekst uni kesib o'tishi shart.
            await new Promise((r) => setTimeout(r, 1));
          }
          resolve(context.stats()?.count ?? -1);
        });
      });

    await expect(Promise.all([request(2), request(5), request(9)])).resolves.toEqual([
      2, 5, 9,
    ]);
  });
});

describe('QueryMetricsLogger', () => {
  it('har bir so‘rovni sanaydi, lekin jim turadi (verbose o‘chiq)', () => {
    const context = new QueryContextService();
    const metrics = metricsStub();
    const logger = new QueryMetricsLogger(context, metrics.service, configWith(false));

    const count = context.run(() => {
      logger.logQuery('SELECT 1');
      logger.logQuery('SELECT 2');
      return context.stats()?.count;
    });

    expect(count).toBe(2);
    expect(metrics.slow).toHaveLength(0);
  });

  it('sekin so‘rovni ham hisobga, ham metrikaga yozadi', () => {
    const context = new QueryContextService();
    const metrics = metricsStub();
    const logger = new QueryMetricsLogger(context, metrics.service, configWith(false));

    const stats = context.run(() => {
      logger.logQuery('UPDATE students SET name = $1');
      logger.logQuerySlow(1250, 'UPDATE students SET name = $1');
      return context.stats();
    });

    expect(stats).toEqual({ count: 1, slowCount: 1, slowTotalMs: 1250 });
    // Metrika sekundlarda o'lchanadi — millisekund emas.
    expect(metrics.slow).toEqual([{ operation: 'update', seconds: 1.25 }]);
  });

  it('operatsiya turini SQL boshidan aniqlaydi', () => {
    const context = new QueryContextService();
    const metrics = metricsStub();
    const logger = new QueryMetricsLogger(context, metrics.service, configWith(false));

    logger.logQueryError('xato', '  SELECT * FROM users');
    logger.logQueryError('xato', 'INSERT INTO users VALUES (1)');
    logger.logQueryError('xato', 'DELETE FROM users');
    logger.logQueryError('xato', 'BEGIN');

    expect(metrics.errors).toEqual(['select', 'insert', 'delete', 'other']);
  });
});
