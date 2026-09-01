import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ObservabilityModule } from '../../modules/observability/observability.module';
import { DbHealthCollector } from './db-health/db-health.collector';
import { QueryContextMiddleware } from './query-context.middleware';
import { QueryContextService } from './query-context.service';
import { QueryMetricsLogger } from './query-metrics.logger';

/**
 * SQL o'lchov qatlamining "TypeORM'gacha" qismi
 * (docs/postgres-senior-plan.md, 1.3-band).
 *
 * `TenantModule` bilan bir xil naqsh: global modul + har so'rovga kontekst
 * ochadigan middleware.
 *
 * DIQQAT — `DbPoolMetricsService` ataylab bu yerda EMAS
 * (`DbPoolMetricsModule` ga qarang). Sabab: bu modulning `QueryMetricsLogger`i
 * `TypeOrmModule.forRootAsync` fabrikasiga kerak, ya'ni TypeORM undan oldin
 * qurilishi mumkin emas. Pool metrikasi esa aksincha, tayyor `DataSource` ni
 * talab qiladi. Ikkalasi bitta modulda bo'lsa — aylanma bog'liqlik.
 */
@Global()
@Module({
  imports: [ObservabilityModule],
  providers: [QueryContextService, QueryMetricsLogger, DbHealthCollector],
  exports: [QueryContextService, QueryMetricsLogger, DbHealthCollector],
})
export class DatabaseObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(QueryContextMiddleware).forRoutes('*');
  }
}
