import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * SHOSHILINCH TUZATISH — production'da crash-loop'ni to'xtatish uchun.
 *
 * Production bazasida TypeORM'ning `migrations` kuzatuv jadvali umuman
 * mavjud emas edi (schema boshqa yo'l bilan, migratsiyalar tarixisiz
 * yaratilgan) — shuning uchun oddiy `dataSource.runMigrations()` BARCHA 110
 * migratsiyani noldan ishga tushirishga urinib, birinchisidayoq "relation
 * already exists" bilan qulab tushdi (`migrate-prod.ts`, 2026-08-25 15:32).
 *
 * Bu skript FAQAT yangi ikkita migratsiyaning ('1790500000000-RolesPrivilegedTier',
 * '1790600000000-AdminSupermanagerDropRoleManagement') SQL amallarini
 * to'g'ridan-to'g'ri bajaradi — `migrations` jadvaliga UMUMAN tegmaydi.
 * Har bir amal idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING / shartli
 * UPDATE-DELETE), shuning uchun qayta-qayta xavfsiz ishga tushirish mumkin.
 *
 * Migratsiya tarixini to'liq backfill qilish (109 eski migratsiyani
 * "bajarilgan" deb belgilash) ATAYLAB bu yerda emas — bu alohida, ongli
 * qaror talab qiladigan qadam.
 */
async function main(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'yuton',
    password: process.env.DATABASE_PASSWORD ?? 'yuton',
    database: process.env.DATABASE_NAME ?? 'yuton_school',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  try {
    await dataSource.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_privileged" boolean NOT NULL DEFAULT false`,
    );
    await dataSource.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'roles.manage-privileged', 'roles', 'manage-privileged')
       ON CONFLICT ("code") DO NOTHING`,
    );
    await dataSource.query(
      `UPDATE "roles" SET "is_privileged" = true
       WHERE "name" = 'director' AND "school_id" IS NULL AND "deleted_at" IS NULL`,
    );
    console.log('1790500000000-RolesPrivilegedTier: bajarildi.');

    await dataSource.query(
      `DELETE FROM "role_permissions"
       WHERE role_id IN (
         SELECT id FROM "roles"
         WHERE name = ANY($1) AND school_id IS NULL AND deleted_at IS NULL
       )
       AND permission_id IN (
         SELECT id FROM "permissions" WHERE code = ANY($2)
       )`,
      [
        ['admin', 'supermanager'],
        ['roles.create', 'roles.update', 'roles.delete', 'roles.assign'],
      ],
    );
    console.log('1790600000000-AdminSupermanagerDropRoleManagement: bajarildi.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Hotfix ishlamadi:', error);
  process.exit(1);
});
