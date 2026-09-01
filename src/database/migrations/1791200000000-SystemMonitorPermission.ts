import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `system.monitor` — baza sog'lig'i chirog'i va uning paneli uchun.
 *
 * `DEFAULT_PERMISSION_CODES` ga kiradi, ya'ni `ceo`, `admin`, `director` va
 * `supermanager` uni boot sinxronizatsiyasi orqali oladi. Maxfiy ro'yxatga
 * KIRMAYDI: endpoint faqat yuklama darajasi va uchta raqam qaytaradi,
 * ma'lumot mazmuni emas — maktab direktori "baza band" ekanini bilsa,
 * sekinlikning sababini tushunadi.
 *
 * Migratsiya reyestr qatorini kafolatlaydi: `IdentitySeedService` yetishmagan
 * ruxsatlarni o'zi qo'shadi, lekin `DISABLE_BOOTSTRAP_SEED=true` bo'lsa
 * o'tkazib yuboriladi. Migratsiya esa deploy zanjirida ilovadan OLDIN ishlaydi.
 */
export class SystemMonitorPermission1791200000000 implements MigrationInterface {
  name = 'SystemMonitorPermission1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'system.monitor', 'system', 'monitor')
       ON CONFLICT ("code") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id
       FROM "roles" r
       JOIN "permissions" p ON p.code = 'system.monitor'
       WHERE r.name IN ('ceo', 'admin', 'director', 'supermanager')
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = 'system.monitor')`,
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'system.monitor'`);
  }
}
