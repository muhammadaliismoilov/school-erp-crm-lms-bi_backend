import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DbHealthCollector } from './db-health.collector';
import {
  DEFAULT_DB_HEALTH_THRESHOLDS,
  evaluateDbHealth,
  type DbHealthLevel,
  type DbHealthSignal,
  type DbHealthThresholds,
} from './db-health.levels';

export interface DbHealthSnapshot {
  level: DbHealthLevel;
  /** Darajani ko'targan signallar — panel shuni matn qilib ko'rsatadi. */
  signals: DbHealthSignal[];
  waiting: number;
  slowPerMinute: number;
  errorsPerMinute: number;
  /** Ilova hali isinmoqda — daraja ataylab `ok` deb qaytariladi. */
  warmingUp: boolean;
}

interface PgPoolCounters {
  waitingCount?: number;
}

/**
 * Baza sog'lig'ining joriy holati — chiroq shu yerdan boqiladi.
 *
 * MUHIM QOIDA: bu servis BAZAGA SO'ROV YUBORMAYDI. Barcha qiymatlar
 * xotiradagi hisoblagichlardan va pool ob'yektining maydonlaridan olinadi.
 * Aks holda o'lchov asbobi o'lchayotgan narsani buzardi — yuklama oshgan
 * sayin chiroq ham yuklama qo'shardi.
 *
 * `DataSource` faqat pool hisoblagichini o'qish uchun kerak (`DbPoolMetrics
 * Service` bilan bir xil naqsh); `query()` hech qachon chaqirilmaydi.
 */
@Injectable()
export class DbHealthService {
  private readonly logger = new Logger('DbHealth');
  private readonly thresholds: DbHealthThresholds;
  private readonly warmupSeconds: number;
  /** Oxirgi e'lon qilingan daraja — faqat O'ZGARISH jurnalga yoziladi. */
  private lastLevel: DbHealthLevel = 'ok';

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly collector: DbHealthCollector,
    configService: ConfigService,
  ) {
    this.thresholds =
      configService.get<DbHealthThresholds>('database.health') ??
      DEFAULT_DB_HEALTH_THRESHOLDS;
    this.warmupSeconds = configService.get<number>('database.health.warmupSeconds') ?? 60;
  }

  snapshot(now: number = Date.now()): DbHealthSnapshot {
    const rates = this.collector.ratesPerMinute(now);
    const waiting = this.waitingCount();

    // Isinish oynasi: Render Free tier'da sovuq start birinchi so'rovni
    // sekundlarga cho'zadi va bu chiroqni bekorga qizartirardi.
    if (process.uptime() < this.warmupSeconds) {
      return {
        level: 'ok',
        signals: [],
        waiting,
        slowPerMinute: rates.slowPerMinute,
        errorsPerMinute: rates.errorsPerMinute,
        warmingUp: true,
      };
    }

    const verdict = evaluateDbHealth(
      { waiting, slowPerMinute: rates.slowPerMinute, errorsPerMinute: rates.errorsPerMinute },
      this.thresholds,
    );

    this.logTransition(verdict.level, waiting, rates.slowPerMinute, rates.errorsPerMinute);

    return {
      level: verdict.level,
      signals: verdict.signals,
      waiting,
      slowPerMinute: rates.slowPerMinute,
      errorsPerMinute: rates.errorsPerMinute,
      warmingUp: false,
    };
  }

  /**
   * Daraja o'zgarganda bir marta jurnalga yozadi.
   *
   * Bu chiroqning o'zidan MUHIMROQ: chegaralar hozir taxminiy, va ularni
   * haqiqatga moslash uchun production'dagi haqiqiy o'tishlar tarixi kerak.
   */
  private logTransition(
    level: DbHealthLevel,
    waiting: number,
    slowPerMinute: number,
    errorsPerMinute: number,
  ): void {
    if (level === this.lastLevel) return;
    const line =
      `${this.lastLevel} → ${level} ` +
      `(waiting=${waiting}, slow/min=${slowPerMinute}, errors/min=${errorsPerMinute})`;
    if (level === 'ok') this.logger.log(line);
    else this.logger.warn(line);
    this.lastLevel = level;
  }

  /**
   * Pool navbati. Drayverning ichki tuzilishiga tayanadi, shuning uchun
   * himoyalangan: tuzilma o'zgarsa 0 qaytadi va chiroq boshqa ikki signalga
   * tayanib ishlashda davom etadi.
   */
  private waitingCount(): number {
    const driver = this.dataSource.driver as unknown as { master?: PgPoolCounters };
    return driver?.master?.waitingCount ?? 0;
  }
}
