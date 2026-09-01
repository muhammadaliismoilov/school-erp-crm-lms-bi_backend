import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number.parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  username: process.env.DATABASE_USER ?? "yuton",
  password: process.env.DATABASE_PASSWORD ?? "yuton",
  name: process.env.DATABASE_NAME ?? "yuton_school",
  ssl: process.env.DATABASE_SSL === "true",
  logging: process.env.TYPEORM_LOGGING === "true",
  synchronize: process.env.TYPEORM_SYNCHRONIZE === "true",
  /**
   * Shu chegaradan (ms) uzun so'rov "sekin" hisoblanadi: TypeORM
   * `logQuerySlow` ni chaqiradi, biz esa uni metrika va logga yozamiz.
   * PostgreSQL tomonidagi `log_min_duration_statement` bilan bir xil
   * qiymatda ushlab turiladi (docker-compose: 300ms).
   */
  slowQueryMs: Number.parseInt(process.env.DB_SLOW_QUERY_MS ?? "300", 10),
  /**
   * Sog'liq chirog'ining chegaralari — ATAYLAB `.env` da.
   *
   * Standart qiymatlar o'lchovdan emas, taxmindan olingan: bazada hali
   * tayanadigan yuklama taqsimoti yig'ilmagan. `DbHealthService` daraja
   * o'zgarishlarini jurnalga yozadi; kalibrlash o'sha jurnal asosida,
   * DEPLOY'SIZ qilinadi.
   */
  health: {
    waitingBusy: Number.parseInt(process.env.DB_HEALTH_WAITING_BUSY ?? "1", 10),
    waitingCritical: Number.parseInt(process.env.DB_HEALTH_WAITING_CRITICAL ?? "4", 10),
    slowBusy: Number.parseInt(process.env.DB_HEALTH_SLOW_BUSY ?? "3", 10),
    slowCritical: Number.parseInt(process.env.DB_HEALTH_SLOW_CRITICAL ?? "15", 10),
    /**
     * Ishga tushgandan keyingi jim oyna. Render Free tier'da uyqudan
     * uyg'ongan birinchi so'rov 6.4 s ketgani o'lchangan — chiroq shu
     * sababdan bekorga qizarmasligi kerak.
     */
    warmupSeconds: Number.parseInt(process.env.DB_HEALTH_WARMUP_SECONDS ?? "60", 10),
  },
  /**
   * Connection pool va sessiya timeout'lari (docs/postgres-senior-plan.md, 2.1-band).
   * Kichik, barqaror pool + qat'iy timeout'lar: bitta yomon so'rov yoki osilib
   * qolgan tranzaksiya butun pool'ni band qilib qo'ymasligi, va ulanish
   * navbatga tushsa cheksiz emas, chegaralangan vaqt kutishi kerak.
   */
  pool: {
    max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
    min: Number.parseInt(process.env.DATABASE_POOL_MIN ?? "2", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statementTimeoutMs: 15_000,
    idleInTransactionSessionTimeoutMs: 30_000,
    lockTimeoutMs: 5_000,
  },
  replica: {
    host: process.env.DATABASE_REPLICA_HOST,
    port: Number.parseInt(process.env.DATABASE_REPLICA_PORT ?? process.env.DATABASE_PORT ?? "5432", 10),
    username: process.env.DATABASE_REPLICA_USER,
    password: process.env.DATABASE_REPLICA_PASSWORD,
    name: process.env.DATABASE_REPLICA_NAME,
  },
}));
