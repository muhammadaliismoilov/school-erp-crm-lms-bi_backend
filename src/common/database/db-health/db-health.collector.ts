import { Injectable } from '@nestjs/common';

/** Bitta vaqt oynasi ichidagi hodisalar. */
interface Bucket {
  startedAt: number;
  slow: number;
  errors: number;
}

const BUCKET_MS = 10_000;
const BUCKET_COUNT = 6; // 6 × 10 s = 1 daqiqalik oyna

/**
 * Tezlikni hisoblashda eng kam kuzatuv oynasi.
 *
 * Busiz qisqa portlash haddan tashqari kuchaytirilardi: 10 soniyada 5 ta
 * sekin so'rov "daqiqasiga 30 ta" bo'lib chiqib, chiroqni darhol qizil
 * qilardi. Bir necha soniyalik portlash — surunkali yuklama emas. 30 s
 * bo'luvchi bilan o'sha holat "10/daq" ga tushadi: sezilarli, lekin
 * shovqin emas.
 */
const MIN_WINDOW_MS = 30_000;

export interface DbEventRates {
  slowPerMinute: number;
  errorsPerMinute: number;
}

/**
 * Sekin so'rov va DB xatolarini SIRPANUVCHI OYNADA sanaydi.
 *
 * NEGA ALOHIDA SINF (`DbHealthService` ichida emas): bu yozuv yo'li, va uni
 * `QueryMetricsLogger` chaqiradi. Logger esa TypeORM modulining fabrikasiga
 * kiradi, ya'ni `DataSource` dan OLDIN quriladi. Agar shu sinf `DataSource`
 * ni so'rasa, aylanma bog'liqlik hosil bo'lardi:
 *   DataSource → TypeOrmModule fabrikasi → QueryMetricsLogger → DataSource
 * Shuning uchun yozuv yo'li (bu sinf) hech qanday DB bog'liqligini olmaydi,
 * o'qish yo'li (`DbHealthService`) esa poolni alohida o'qiydi.
 *
 * NEGA `MetricsService` DAN O'QIMAYMIZ: u `METRICS_ENABLED=false` bo'lganda
 * hisoblagichlarni umuman oshirmaydi. Chiroq o'sha holatda doim yashil
 * bo'lib YOLG'ON gapirardi — sog'liq ko'rsatkichi Prometheus sozlamasiga
 * bog'liq bo'lmasligi kerak.
 */
@Injectable()
export class DbHealthCollector {
  private readonly buckets: Bucket[] = [];

  recordSlowQuery(now: number = Date.now()): void {
    this.current(now).slow += 1;
  }

  recordQueryError(now: number = Date.now()): void {
    this.current(now).errors += 1;
  }

  /**
   * Oyna ichidagi hodisalar, daqiqaga keltirilgan.
   *
   * Oyna to'lmagan bo'lsa ham (ilova endi ko'tarilgan) kuzatilgan vaqtga
   * bo'linadi — aks holda birinchi soniyalarda tezlik sun'iy past ko'rinardi.
   */
  ratesPerMinute(now: number = Date.now()): DbEventRates {
    this.evict(now);
    if (this.buckets.length === 0) {
      return { slowPerMinute: 0, errorsPerMinute: 0 };
    }

    const slow = this.buckets.reduce((sum, b) => sum + b.slow, 0);
    const errors = this.buckets.reduce((sum, b) => sum + b.errors, 0);
    const observedMs = Math.max(now - this.buckets[0].startedAt, MIN_WINDOW_MS);
    const perMinute = (total: number): number =>
      Math.round((total * 60_000) / observedMs);

    return { slowPerMinute: perMinute(slow), errorsPerMinute: perMinute(errors) };
  }

  private current(now: number): Bucket {
    this.evict(now);
    const last = this.buckets[this.buckets.length - 1];
    if (last && now - last.startedAt < BUCKET_MS) {
      return last;
    }
    const bucket: Bucket = { startedAt: now, slow: 0, errors: 0 };
    this.buckets.push(bucket);
    return bucket;
  }

  /** Oynadan chiqib ketgan bucketlarni tashlaydi. */
  private evict(now: number): void {
    const cutoff = now - BUCKET_MS * BUCKET_COUNT;
    while (this.buckets.length > 0 && this.buckets[0].startedAt < cutoff) {
      this.buckets.shift();
    }
  }
}
