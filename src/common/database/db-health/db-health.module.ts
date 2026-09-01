import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DbHealthHeaderInterceptor } from './db-health.interceptor';
import { DbHealthService } from './db-health.service';

/**
 * Sog'liq chirog'ining O'QISH yo'li.
 *
 * `DbPoolMetricsModule` bilan bir xil sababdan alohida: `DbHealthService`
 * tayyor `DataSource` ni inject qiladi, ya'ni TypeORM'dan KEYIN qurilishi
 * shart. Yozuv yo'li (`DbHealthCollector`) esa aksincha — TypeORM
 * fabrikasidagi loggerga kerak, shuning uchun u `DatabaseObservabilityModule`
 * da qoladi.
 *
 * `@Global` — darajani interceptor ham, controller ham o'qiydi.
 */
@Global()
@Module({
  providers: [
    DbHealthService,
    { provide: APP_INTERCEPTOR, useClass: DbHealthHeaderInterceptor },
  ],
  exports: [DbHealthService],
})
export class DbHealthModule {}
