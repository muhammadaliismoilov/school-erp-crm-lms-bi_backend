import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  trustProxy: process.env.TRUST_PROXY === 'true',
  bodyLimit: process.env.BODY_LIMIT ?? '1mb',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  rateLimitTtlMs: Number.parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
  rateLimitLimit: Number.parseInt(process.env.RATE_LIMIT_LIMIT ?? '120', 10),
  encryptionKey: process.env.ENCRYPTION_KEY,
}));
