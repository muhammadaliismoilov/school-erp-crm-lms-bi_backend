import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

/**
 * Prometheus endpointi bu yerda RO'YXATGA OLINMAYDI (T-03) — `main.ts`
 * uni `MetricsService` orqali alohida, ichki portda (`startMetricsServer`)
 * ko'taradi. Sabab: asosiy ilova portidagi har qanday yo'l production'da
 * nginx orqali ochiq internetga chiqadi.
 */
@Module({
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class ObservabilityModule {}
