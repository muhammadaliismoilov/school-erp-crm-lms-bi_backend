import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MetricsService } from '../../modules/observability/metrics.service';

/** `pg` kutubxonasining Pool ob'yektidan bizga kerak bo'lgan hisoblagichlar. */
interface PgPoolCounters {
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

/**
 * Connection pool holatini metrikaga chiqaradi
 * (docs/postgres-senior-plan.md, 1.3-band).
 *
 * Nega muhim: har PostgreSQL ulanishi — alohida OS processi, shuning uchun
 * pool kichik va barqaror bo'lishi kerak. `waiting` doimiy noldan katta
 * bo'lsa — so'rovlar ulanish kutyapti, ya'ni pool tor yoki so'rovlar uzoq
 * ushlab turilyapti. Bu 2-bosqichdagi pool sozlamalari uchun bazaviy o'lchov.
 */
@Injectable()
export class DbPoolMetricsService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.metrics.registerGauge({
      name: 'yuton_db_pool_total_connections',
      help: 'Total connections currently held by the primary database pool.',
      collect: () => this.pool()?.totalCount,
    });
    this.metrics.registerGauge({
      name: 'yuton_db_pool_idle_connections',
      help: 'Idle connections in the primary database pool.',
      collect: () => this.pool()?.idleCount,
    });
    this.metrics.registerGauge({
      name: 'yuton_db_pool_waiting_requests',
      help: 'Requests waiting for a free connection in the primary database pool.',
      collect: () => this.pool()?.waitingCount,
    });
  }

  /**
   * TypeORM PostgreSQL drayveridagi master pool. Drayverning ichki tuzilishiga
   * tayanadi, shuning uchun himoyalangan: tuzilma o'zgarsa gauge shunchaki
   * qiymat bermaydi, ilova ishlashda davom etadi.
   */
  private pool(): PgPoolCounters | null {
    const driver = this.dataSource.driver as unknown as {
      master?: PgPoolCounters;
    };
    return driver?.master ?? null;
  }
}
