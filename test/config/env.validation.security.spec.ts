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
