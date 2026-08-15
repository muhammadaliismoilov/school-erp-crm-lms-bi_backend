import { registerAs } from '@nestjs/config';

export default registerAs('observability', () => ({
  sentryDsn: process.env.SENTRY_DSN,
  sentryTracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  /** `PORT` dan ATAYLAB alohida — sabab: metrics-server.ts izohida. */
  metricsPort: Number.parseInt(process.env.METRICS_PORT ?? '9464', 10),
}));
