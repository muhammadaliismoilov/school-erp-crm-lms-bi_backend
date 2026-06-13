import { registerAs } from '@nestjs/config';

const parseCorsOrigins = (value?: string): string[] | boolean => {
  if (!value || value.trim() === '*' || value.trim() === '') {
    return true;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  defaultLocale: process.env.DEFAULT_LOCALE ?? 'uz',
  timezone: process.env.TZ ?? 'Asia/Tashkent',
}));
