import { registerAs } from '@nestjs/config';

const parseRedisUrl = (value?: string) => {
  const rawUrl = value ?? 'redis://localhost:6379/0';
  const url = new URL(rawUrl);

  return {
    url: rawUrl,
    host: url.hostname,
    port: Number.parseInt(url.port || '6379', 10),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.parseInt(url.pathname.replace('/', '') || '0', 10),
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
};

export default registerAs('redis', () => parseRedisUrl(process.env.REDIS_URL));
