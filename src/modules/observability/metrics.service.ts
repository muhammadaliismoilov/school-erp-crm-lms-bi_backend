import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

/** SQL so'rov turi — metrika yorlig'i sifatida (yuqori kardinallikdan qochish uchun). */
export type DbOperation = 'select' | 'insert' | 'update' | 'delete' | 'other';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();
  private readonly enabled: boolean;
  private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status_code'>;
  private readonly httpRequestDurationSeconds: Histogram<'method' | 'route' | 'status_code'>;
  private readonly dbQueriesPerRequest: Histogram<'method' | 'route'>;
  private readonly dbSlowQueryDurationSeconds: Histogram<'operation'>;
  private readonly dbSlowQueriesTotal: Counter<'operation'>;
  private readonly dbQueryErrorsTotal: Counter<'operation'>;

  constructor(configService: ConfigService) {
    this.enabled = configService.get<boolean>('observability.metricsEnabled') ?? true;
    this.registry.setDefaultLabels({
      service: 'yuton-backend',
      environment: configService.get<string>('app.env') ?? 'development',
    });
    this.httpRequestsTotal = new Counter({
      name: 'yuton_http_requests_total',
      help: 'Total number of HTTP requests handled by the API.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.httpRequestDurationSeconds = new Histogram({
      name: 'yuton_http_request_duration_seconds',
      help: 'HTTP request duration in seconds.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
    // N+1 detektori: bitta HTTP so'rovda nechta SQL ketgani.
    // Bucketlar rejadagi qabul mezoniga moslangan: ro'yxat endpointlari <= 5,
    // dashboard <= 10; 20 dan yuqorisi — tekshirish talab qiladigan zona.
    this.dbQueriesPerRequest = new Histogram({
      name: 'yuton_db_queries_per_request',
      help: 'Number of SQL queries executed while handling a single HTTP request.',
      labelNames: ['method', 'route'],
      buckets: [1, 2, 5, 10, 20, 50, 100, 250],
      registers: [this.registry],
    });
    this.dbSlowQueryDurationSeconds = new Histogram({
      name: 'yuton_db_slow_query_duration_seconds',
      help: 'Duration of SQL queries slower than the configured threshold.',
      labelNames: ['operation'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
    this.dbSlowQueriesTotal = new Counter({
      name: 'yuton_db_slow_queries_total',
      help: 'Total number of SQL queries slower than the configured threshold.',
      labelNames: ['operation'],
      registers: [this.registry],
    });
    this.dbQueryErrorsTotal = new Counter({
      name: 'yuton_db_query_errors_total',
      help: 'Total number of failed SQL queries.',
      labelNames: ['operation'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      return;
    }

    collectDefaultMetrics({
      register: this.registry,
      prefix: 'yuton_',
    });
  }

  observeHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationSeconds: number;
  }): void {
    if (!this.enabled) {
      return;
    }

    const labels = {
      method: input.method,
      route: input.route,
      status_code: String(input.statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, input.durationSeconds);
  }

  /** Bitta HTTP so'rovda bajarilgan SQL so'rovlar soni (N+1 detektori). */
  observeQueriesPerRequest(input: {
    method: string;
    route: string;
    queryCount: number;
  }): void {
    if (!this.enabled) {
      return;
    }

    this.dbQueriesPerRequest.observe(
      { method: input.method, route: input.route },
      input.queryCount,
    );
  }

  /** Chegaradan uzun davom etgan SQL so'rov. */
  observeSlowQuery(operation: DbOperation, durationSeconds: number): void {
    if (!this.enabled) {
      return;
    }

    this.dbSlowQueryDurationSeconds.observe({ operation }, durationSeconds);
    this.dbSlowQueriesTotal.inc({ operation });
  }

  /** Xato bilan tugagan SQL so'rov. */
  incQueryError(operation: DbOperation): void {
    if (!this.enabled) {
      return;
    }

    this.dbQueryErrorsTotal.inc({ operation });
  }

  /**
   * Connection pool holati kabi "so'rov paytida o'lchanadigan" gauge'ni
   * ro'yxatdan o'tkazadi. `collect` funksiyasi `/metrics` har chaqirilganda
   * ishlaydi — bu pool holatini doimiy pollingsiz o'qish imkonini beradi.
   */
  registerGauge(input: {
    name: string;
    help: string;
    collect: () => number | undefined;
  }): void {
    if (!this.enabled) {
      return;
    }

    const { collect } = input;
    // eslint-disable-next-line no-new
    new Gauge({
      name: input.name,
      help: input.help,
      registers: [this.registry],
      collect() {
        const value = collect();
        if (typeof value === 'number' && Number.isFinite(value)) {
          this.set(value);
        }
      },
    });
  }

  contentType(): string {
    return this.registry.contentType;
  }

  metrics(): Promise<string> {
    return this.enabled ? this.registry.metrics() : Promise.resolve('');
  }
}
