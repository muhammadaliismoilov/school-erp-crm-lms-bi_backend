# Production Architecture

This backend is wired for a layered production deployment:

1. Edge security runs before NestJS. Cloudflare or Nginx terminates TLS, redirects HTTP to HTTPS, applies DDoS/rate-limit policy, and forwards trusted proxy headers.
2. API gateway controls are global in `main.ts`: Helmet headers, CORS policy, body size limits, JWT guards, throttling, class-validator, localized errors, response envelopes, and Swagger.
3. Application code stays modular: controllers handle HTTP, services handle business logic, guards/interceptors handle cross-cutting behavior, and `WorkersModule` handles BullMQ async jobs plus cron scheduling.
4. Data access uses TypeORM migrations/repositories, optional Postgres read replica config, Redis for BullMQ queues, and S3-compatible object storage for files.
5. Observability is built in: Sentry captures 500-level exceptions, Prometheus scrapes the dedicated internal metrics port (`METRICS_PORT`, default `9464` — deliberately separate from the public app port so nginx's catch-all `location /` can never expose it), and Grafana is provisioned with Prometheus as the default datasource.
6. Security cross-cutting behavior includes OWASP-style validation, strong JWT secret checks, no wildcard production CORS, no production synchronize, sanitized audit logs for mutating requests, and secrets supplied through `.env` or a vault.

Production start checklist:

- Fill `.env` from `.env.example` with real secrets from a vault.
- Put TLS certificates in `deploy/nginx/certs/fullchain.pem` and `deploy/nginx/certs/privkey.pem`.
- Set `SWAGGER_ENABLED=false` if docs must not be exposed in production.
- Run migrations with `npm run migration:run` before switching traffic.
- Start Docker stack with `docker compose -f docker-compose.prod.yml up -d --build`.
- Verify health at `/api/v1/health`, metrics at `api:9464/metrics` from inside the `backend` Docker network (not publicly reachable — that's intentional), and logs in Sentry/Grafana.
