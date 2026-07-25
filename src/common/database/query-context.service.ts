import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Bitta HTTP so'rov davomida bajarilgan SQL so'rovlar hisobi. */
export interface QueryStats {
  /** Jami SQL so'rovlar soni. */
  count: number;
  /** "Sekin" deb belgilangan (maxQueryExecutionTime dan uzun) so'rovlar soni. */
  slowCount: number;
  /** Sekin so'rovlarga ketgan jami vaqt (ms). */
  slowTotalMs: number;
}

/**
 * Har bir HTTP so'rov davomida nechta SQL so'rov ketganini sanaydi
 * (docs/postgres-senior-plan.md, 1.3-band).
 *
 * Nega kerak: N+1 muammosi EXPLAIN'da ko'rinmaydi — har bir alohida so'rov
 * sog'lom bo'ladi, dard esa ularning sonida. Uni faqat "bitta request =
 * nechta query" hisoblagichi ushlaydi.
 *
 * `TenantContextService` bilan bir xil naqsh: middleware so'rov boshida
 * `run()` bilan bo'sh kontekst ochadi, TypeORM logger `record*` bilan
 * to'ldiradi, interceptor esa oxirida `stats()` ni o'qib metrikaga yozadi.
 */
@Injectable()
export class QueryContextService {
  private readonly als = new AsyncLocalStorage<QueryStats>();

  /** So'rov boshida bo'sh hisob ochadi (middleware chaqiradi). */
  run<T>(callback: () => T): T {
    return this.als.run({ count: 0, slowCount: 0, slowTotalMs: 0 }, callback);
  }

  /** Har bajarilgan SQL so'rovni sanaydi. */
  recordQuery(): void {
    const store = this.als.getStore();
    if (!store) return;
    store.count += 1;
  }

  /** Sekin so'rovni alohida qayd etadi (count `recordQuery` da allaqachon oshgan). */
  recordSlowQuery(durationMs: number): void {
    const store = this.als.getStore();
    if (!store) return;
    store.slowCount += 1;
    store.slowTotalMs += durationMs;
  }

  /** Joriy so'rov statistikasi; HTTP konteksti tashqarisida `null`. */
  stats(): QueryStats | null {
    return this.als.getStore() ?? null;
  }
}
