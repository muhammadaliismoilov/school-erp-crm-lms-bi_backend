# Yuton School Backend

Production-oriented NestJS backend scaffold for a unified school management system. It starts as a modular monolith and keeps clear module boundaries for later extraction into services.

## Included

- NestJS 11, TypeScript strict mode, TypeORM, PostgreSQL
- JWT auth with refresh-token rotation and Argon2id password hashing
- Role/permission RBAC with wildcard permissions such as `students.*`
- Strict DTO validation for body, query, and route params; unknown fields are rejected
- Uzbek, Russian, and English localized API errors with `Accept-Language` support
- Global validation, exception envelope, response envelope, Helmet, CORS, throttling, Swagger
- MVP modules: auth, users, roles, CRM leads, students/parents, academic basics, attendance, finance, notifications, settings, audit, files
- Phase-2 bounded-context placeholders: HR, inventory, youth services, LMS, analytics
- Docker Compose for Postgres, Redis, and MinIO

## Quick Start

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis minio
npm run start:dev
```

Swagger is available at `http://localhost:3000/docs`. The OpenAPI document includes DTO schemas, endpoint summaries, auth requirements, localized error responses, and the global `Accept-Language` header.

For local development, `.env.example` enables `TYPEORM_SYNCHRONIZE=true` so the schema can be created quickly. In production this must be `false`; generate and run migrations instead.


## Localization and Validation

All request bodies, route params, and query params must pass DTO validation. The global validation pipe uses:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `forbidUnknownValues: true`
- `transform: true`

Send `Accept-Language: uz`, `Accept-Language: ru`, or `Accept-Language: en` to choose the primary error message language. Every error response still includes all three translations:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "locale": "uz",
    "message": "Kiritilgan ma'lumotlar noto'g'ri",
    "messages": {
      "uz": "Kiritilgan ma'lumotlar noto'g'ri",
      "ru": "Введенные данные некорректны",
      "en": "The submitted data is invalid"
    }
  }
}
```


## Multilingual Data Model

The backend uses a hybrid multilingual model:

- Static system text, validation errors, and API errors use code-level i18n dictionaries.
- Short translatable labels use JSONB `LocalizedText` objects: `{ "uz": "...", "ru": "...", "en": "..." }`.
- Large template/content text uses dedicated translation tables. For example, notification template body/subject lives in `notification_template_translations` with one row per locale.
- Operational identifiers are not translated: usernames, permission codes, role system names, student codes, phone numbers, emails, dates, amounts, class codes such as `5-A`, and academic years such as `2026-2027`.

DTO validation requires all three locales for translatable fields. If a localized field is optional, it may be omitted, but when it is present it must be complete.

## Migrations

```bash
npm run migration:generate
npm run migration:run
```

The TypeORM data source is `src/database/data-source.ts`.

## Seeding

```bash
npm run seed
```

`npm run seed` is idempotent: it ensures every permission and system role exists,
then upserts a bootstrap super-admin user. Credentials default to
`yutonseo` / `yutonseo` and can be overridden with `SEED_USERNAME` /
`SEED_PASSWORD`. Run it after `npm run migration:run` (the schema must exist
first). The script reads the same `DATABASE_*` env as the app.

`src/database/migrations/1780000000000-InitialSchema.ts` is the baseline: it
creates the full current schema (all tables, indexes, and foreign keys) and runs
clean on an empty database. Run `npm run migration:run` on a fresh database
before first boot — the app sets `migrationsRun: false`, so migrations are never
applied implicitly. Superseded partial migrations are kept in
`archive/legacy-migrations/` for reference and are intentionally excluded from
the build and the migrations glob.

## Confidential Data Encryption

Sensitive free-text fields (currently psychologist counseling notes in the
`counseling` module) are encrypted at rest with AES-256-GCM via
`EncryptionService`. Set `ENCRYPTION_KEY` (>= 32 characters in production); it is
validated at startup and is a required production env var. Counseling
permissions (`counseling.read` / `counseling.manage`) are deliberately excluded
from the broad director/admin grants — only the `psychologist` role (and the
technical super-admin wildcard) can read decrypted notes.

## Test and Build

```bash
npm test
npm run build
npm run lint
```

## Production Notes

- Set strong `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PASSWORD`, and `ENCRYPTION_KEY` values.
- Keep `TYPEORM_SYNCHRONIZE=false` in production and run `npm run migration:run` on deploy.
- Put the API behind TLS and a reverse proxy.
- Use object storage such as MinIO/S3 for uploaded files; this scaffold stores metadata only.
- Add queue workers for notification delivery and long-running reports when provider integrations are selected.
