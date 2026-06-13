import { registerAs } from '@nestjs/config';

export default registerAs('observability', () => ({
  sentryDsn: process.env.SENTRY_DSN,
  sentryTracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
}));
