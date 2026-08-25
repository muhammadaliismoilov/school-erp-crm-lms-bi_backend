import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { migrationConnection } from './migration-connection';

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
async function main(): Promise<void> {
  // Migratsiya ulanishi ilovanikidan alohida bo'lishi mumkin
  // (`MIGRATION_DATABASE_URL`) — sabab: migration-connection.ts izohiga qarang.
  const { options, tavsif, alohidaUlanish } = migrationConnection({
    synchronize: false,
    logging: true,
    entities: [join(__dirname, '..', '**/*.entity.js')],
    migrations: [join(__dirname, 'migrations/*.js')],
    migrationsTransactionMode: 'each',
  });
  console.log(
    `Migratsiya ulanishi: ${tavsif}` +
      (alohidaUlanish ? ' (alohida MIGRATION_DATABASE_URL)' : ' (ilova ulanishi)'),
  );

  const dataSource = new DataSource(options);

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
