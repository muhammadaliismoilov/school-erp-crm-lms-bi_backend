import { validateEnv } from '../../src/config/env.validation';

const productionConfig = {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_HOST: 'postgres',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'yuton',
  DATABASE_PASSWORD: 'strong-database-password',
  DATABASE_NAME: 'yuton_school',
  JWT_ACCESS_SECRET: 'access-secret-with-more-than-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-with-more-than-32-characters',
  ADMIN_PASSWORD: 'admin-password-with-more-than-16-characters',
  CORS_ORIGINS: 'https://app.yuton.uz',
  REDIS_URL: 'redis://redis:6379/0',
  S3_ENDPOINT: 'http://minio:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'yuton-files',
  S3_ACCESS_KEY_ID: 'minio-access-key',
  S3_SECRET_ACCESS_KEY: 'minio-secret-key',
  SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
  ENCRYPTION_KEY: 'encryption-key-with-more-than-32-characters',
  RATE_LIMIT_TTL_MS: '60000',
  RATE_LIMIT_LIMIT: '120',
  BODY_LIMIT: '1mb',
};

describe('validateEnv production security requirements', () => {
  it('requires Redis, object storage, and observability settings in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        REDIS_URL: '',
        S3_BUCKET: '',
        SENTRY_DSN: '',
      }),
    ).toThrow(/Missing production env vars: REDIS_URL, S3_BUCKET, SENTRY_DSN/);
  });

  it('rejects wildcard CORS in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        CORS_ORIGINS: '*',
      }),
    ).toThrow('CORS_ORIGINS cannot be "*" in production');
  });

  it('rejects invalid production rate limit values', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        RATE_LIMIT_LIMIT: '0',
      }),
    ).toThrow('RATE_LIMIT_LIMIT must be a positive integer');
  });

  it('accepts a hardened production config', () => {
    expect(validateEnv(productionConfig)).toBe(productionConfig);
  });
});

// T-03: /metrics endi asosiy ilova portidan (PORT) alohida portda beriladi —
// nginx faqat PORT'ga proksi qiladi, shu sabab bu ajratish buzilsa (ikkalasi
// bir xil portda tursa) metrikalar yana ochiq internetga chiqib qoladi.
describe('validateEnv METRICS_PORT', () => {
  it('rejects an out-of-range METRICS_PORT', () => {
    expect(() =>
      validateEnv({ ...productionConfig, METRICS_PORT: '70000' }),
    ).toThrow('METRICS_PORT must be a valid TCP port');
  });

  it('rejects METRICS_PORT colliding with PORT — this would put metrics back on the public pipeline', () => {
    expect(() =>
      validateEnv({ ...productionConfig, PORT: '3000', METRICS_PORT: '3000' }),
    ).toThrow('METRICS_PORT must differ from PORT');
  });

  it('accepts the default METRICS_PORT (9464) when unset', () => {
    // productionConfig ATAYLAB METRICS_PORT'ni bermaydi — default (9464)
    // PORT (3000) bilan to'qnashmasligi shu yerda tasdiqlanadi.
    expect(() => validateEnv(productionConfig)).not.toThrow();
  });
});

// docs/postgres-senior-plan.md, 2.1-band: noto'g'ri pool konfiguratsiyasi
// production'da sokin ishlamay, boot bosqichida aniq xato bilan ushlanishi kerak.
describe('validateEnv DATABASE_POOL_MAX/MIN', () => {
  it('accepts explicit valid pool sizes', () => {
    expect(() =>
      validateEnv({ ...productionConfig, DATABASE_POOL_MAX: '20', DATABASE_POOL_MIN: '5' }),
    ).not.toThrow();
  });

  it('accepts the defaults (10/2) when unset', () => {
    expect(() => validateEnv(productionConfig)).not.toThrow();
  });

  it('rejects a non-positive DATABASE_POOL_MAX', () => {
    expect(() =>
      validateEnv({ ...productionConfig, DATABASE_POOL_MAX: '0' }),
    ).toThrow('DATABASE_POOL_MAX must be a positive integer');
  });

  it('rejects DATABASE_POOL_MIN greater than DATABASE_POOL_MAX', () => {
    expect(() =>
      validateEnv({ ...productionConfig, DATABASE_POOL_MAX: '5', DATABASE_POOL_MIN: '10' }),
    ).toThrow('DATABASE_POOL_MIN must not exceed DATABASE_POOL_MAX');
  });
});
