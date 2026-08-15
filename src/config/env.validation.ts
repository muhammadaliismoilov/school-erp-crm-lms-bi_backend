const productionOnlyKeys = [
  "DATABASE_HOST",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "ADMIN_PASSWORD",
  "REDIS_URL",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "SENTRY_DSN",
  "ENCRYPTION_KEY",
];

const parseInteger = (value: unknown, fallback: string): number =>
  Number.parseInt(String(value ?? fallback), 10);

const assertTcpPort = (key: string, value: number): void => {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${key} must be a valid TCP port`);
  }
};

const assertPositiveInteger = (key: string, value: number): void => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${key} must be a positive integer`);
  }
};

const assertUrl = (key: string, value?: unknown): void => {
  if (!value) {
    return;
  }

  try {
    new URL(String(value));
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
};

const assertBodyLimit = (value?: unknown): void => {
  if (!value) {
    return;
  }

  if (!/^\d+(b|kb|mb)$/i.test(String(value))) {
    throw new Error("BODY_LIMIT must use b, kb, or mb units");
  }
};

export const validateEnv = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const nodeEnv = String(config.NODE_ENV ?? "development");
  const port = parseInteger(config.PORT, "3000");
  const metricsPort = parseInteger(config.METRICS_PORT, "9464");
  const databasePort = parseInteger(config.DATABASE_PORT, "5432");
  const databaseReplicaPort = config.DATABASE_REPLICA_PORT
    ? parseInteger(config.DATABASE_REPLICA_PORT, "5432")
    : undefined;
  const redisPort = config.REDIS_PORT ? parseInteger(config.REDIS_PORT, "6379") : undefined;
  const rateLimitTtlMs = parseInteger(config.RATE_LIMIT_TTL_MS, "60000");
  const rateLimitLimit = parseInteger(config.RATE_LIMIT_LIMIT, "120");
  const databasePoolMax = parseInteger(config.DATABASE_POOL_MAX, "10");
  const databasePoolMin = parseInteger(config.DATABASE_POOL_MIN, "2");
  const bcryptSaltRounds = config.BCRYPT_SALT_ROUNDS
    ? parseInteger(config.BCRYPT_SALT_ROUNDS, "12")
    : undefined;

  assertTcpPort("PORT", port);
  assertTcpPort("METRICS_PORT", metricsPort);
  if (metricsPort === port) {
    // Ikkalasi bir portda tursa, metrikalar yana asosiy (nginx orqali ochiq)
    // ilova bilan bitta quvurga tushib qoladi — T-03 tuzatishi bekor bo'ladi.
    throw new Error("METRICS_PORT must differ from PORT");
  }
  assertTcpPort("DATABASE_PORT", databasePort);
  if (databaseReplicaPort !== undefined) {
    assertTcpPort("DATABASE_REPLICA_PORT", databaseReplicaPort);
  }
  if (redisPort !== undefined) {
    assertTcpPort("REDIS_PORT", redisPort);
  }
  assertPositiveInteger("RATE_LIMIT_TTL_MS", rateLimitTtlMs);
  assertPositiveInteger("RATE_LIMIT_LIMIT", rateLimitLimit);
  assertPositiveInteger("DATABASE_POOL_MAX", databasePoolMax);
  assertPositiveInteger("DATABASE_POOL_MIN", databasePoolMin);
  if (databasePoolMin > databasePoolMax) {
    throw new Error("DATABASE_POOL_MIN must not exceed DATABASE_POOL_MAX");
  }
  assertBodyLimit(config.BODY_LIMIT ?? "1mb");
  if (
    bcryptSaltRounds !== undefined &&
    (!Number.isInteger(bcryptSaltRounds) || bcryptSaltRounds < 10 || bcryptSaltRounds > 15)
  ) {
    throw new Error("BCRYPT_SALT_ROUNDS must be between 10 and 15");
  }
  assertUrl("REDIS_URL", config.REDIS_URL);
  assertUrl("S3_ENDPOINT", config.S3_ENDPOINT);
  assertUrl("S3_PUBLIC_BASE_URL", config.S3_PUBLIC_BASE_URL);
  assertUrl("SENTRY_DSN", config.SENTRY_DSN);

  const sentrySampleRate = Number.parseFloat(String(config.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"));
  if (Number.isNaN(sentrySampleRate) || sentrySampleRate < 0 || sentrySampleRate > 1) {
    throw new Error("SENTRY_TRACES_SAMPLE_RATE must be between 0 and 1");
  }

  if (nodeEnv === "production") {
    const missing = productionOnlyKeys.filter((key) => !config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing production env vars: ${missing.join(", ")}`);
    }

    if (!config.CORS_ORIGINS || String(config.CORS_ORIGINS).trim() === "*") {
      throw new Error("CORS_ORIGINS cannot be \"*\" in production");
    }

    const insecureCorsOrigins = String(config.CORS_ORIGINS)
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin && !origin.startsWith("https://"));
    if (insecureCorsOrigins.length > 0) {
      throw new Error("CORS_ORIGINS must use HTTPS origins in production");
    }

    for (const secretKey of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
      const secret = String(config[secretKey] ?? "");
      if (secret.length < 32) {
        throw new Error(`${secretKey} must be at least 32 characters in production`);
      }
    }

    if (String(config.JWT_ACCESS_SECRET) === String(config.JWT_REFRESH_SECRET)) {
      throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
    }

    if (bcryptSaltRounds !== undefined && bcryptSaltRounds < 12) {
      throw new Error("BCRYPT_SALT_ROUNDS must be at least 12 in production");
    }

    if (String(config.ADMIN_PASSWORD ?? "").length < 16) {
      throw new Error("ADMIN_PASSWORD must be at least 16 characters in production");
    }

    if (String(config.ENCRYPTION_KEY ?? "").length < 32) {
      throw new Error("ENCRYPTION_KEY must be at least 32 characters in production");
    }

    if (config.TYPEORM_SYNCHRONIZE === "true") {
      throw new Error("TYPEORM_SYNCHRONIZE must never be true in production");
    }
  }

  return config;
};
