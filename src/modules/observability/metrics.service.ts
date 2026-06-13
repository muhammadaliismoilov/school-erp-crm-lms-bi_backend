import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();
  private readonly enabled: boolean;
  private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status_code'>;
  private readonly httpRequestDurationSeconds: Histogram<'method' | 'route' | 'status_code'>;

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

  contentType(): string {
    return this.registry.contentType;
  }

  metrics(): Promise<string> {
    return this.enabled ? this.registry.metrics() : Promise.resolve('');
  }
}
