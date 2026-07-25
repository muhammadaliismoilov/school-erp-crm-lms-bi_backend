import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../modules/observability/observability.module';
import { DbPoolMetricsService } from './db-pool-metrics.service';

/**
 * Connection pool gauge'lari (docs/postgres-senior-plan.md, 1.3-band).
 *
 * Alohida modul, chunki `DbPoolMetricsService` tayyor `DataSource` ni inject
 * qiladi — ya'ni u TypeORM'dan KEYIN qurilishi shart. `DatabaseObservabilityModule`
 * esa aksincha, TypeORM'dan OLDIN kerak. Shu sababli ajratilgan.
 */
@Module({
  imports: [ObservabilityModule],
  providers: [DbPoolMetricsService],
})
export class DbPoolMetricsModule {}
