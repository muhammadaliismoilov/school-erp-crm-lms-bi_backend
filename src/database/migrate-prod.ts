import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';

/**
 * Production-uchun migratsiya ishga tushiruvchi — `npm run migration:run`dan
 * FARQLI: u `typeorm-ts-node-commonjs` orqali `.ts` fayllarni ts-node bilan
 * o'qiydi, buning uchun `src/` va devDependencies (ts-node, typescript) kerak.
 * Production Docker image esa faqat `dist/`ni saqlaydi va devDependencies'ni
 * o'chiradi (`npm ci --omit=dev`) — shuning uchun bu skript FAQAT kompilyatsiya
 * qilingan `.js` fayllarga (`dist/src/**`) ishora qiladi va oddiy `node` bilan
 * ishga tushadi, ts-node shart emas.
 *
 * Ishga tushirish: `node dist/src/database/migrate-prod.js`
 * (build allaqachon shu faylni ham `dist/src/database/migrate-prod.js`ga
 * kompilyatsiya qiladi — alohida sozlash shart emas.)
 */
const databaseSsl = process.env.DATABASE_SSL === 'true';

async function main(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'yuton',
    password: process.env.DATABASE_PASSWORD ?? 'yuton',
    database: process.env.DATABASE_NAME ?? 'yuton_school',
    synchronize: false,
    logging: true,
    entities: [join(__dirname, '..', '**/*.entity.js')],
    migrations: [join(__dirname, 'migrations/*.js')],
    migrationsTransactionMode: 'each',
    ssl: databaseSsl ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  try {
    const executed = await dataSource.runMigrations();
    if (executed.length === 0) {
      console.log('Bajariladigan yangi migratsiya yo\'q — baza allaqachon yangilangan.');
    } else {
      console.log(`${executed.length} ta migratsiya bajarildi:`);
      for (const migration of executed) console.log(` - ${migration.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Migratsiya ishga tushmadi:', error);
  process.exit(1);
});
