import 'dotenv/config';
import { DataSource } from 'typeorm';

const databaseSsl = process.env.DATABASE_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'yuton',
  password: process.env.DATABASE_PASSWORD ?? 'yuton',
  database: process.env.DATABASE_NAME ?? 'yuton_school',
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  // 'all' (standart) butun to'plamni bitta tranzaksiyaga o'raydi — bu har
  // migratsiyaning o'z tranzaksiya rejimini (`transaction = false`,
  // `CREATE INDEX CONCURRENTLY` uchun kerak) ustidan yura olmaydi va
  // ForbiddenTransactionModeOverrideError beradi. 'each' — har biri o'z
  // tranzaksiyasida, override qilinganlar (CONCURRENTLY) tranzaksiyasiz.
  migrationsTransactionMode: 'each',
  ssl: databaseSsl ? { rejectUnauthorized: false } : false,
});
