import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RBAC ierarxiyasi — 1-bosqich: himoyalangan rol qatlami.
 *
 * `roles.is_privileged` — direktor va (keyingi migratsiyada yaratiladigan)
 * CEO kabi "yuqori pog'ona" rollarni belgilaydi. Yangi `roles.manage-privileged`
 * kodi shu bayroqli rollarni tahrirlash/o'chirish yoki birovga biriktirish
 * uchun talab qilinadi — `CONFIDENTIAL_PERMISSION_CODES`ga qo'shilgani sababli
 * mavjud direktor/admin/supermanager rollari uni AVTOMATIK olmaydi (faqat
 * keyingi migratsiyada CEO formulasiga qo'lda qo'shiladi).
 *
 * Direktor darhol `is_privileged=true` qilinadi: shu paytdan boshlab
 * direktorning o'zini (yoki yana bir direktorni) faqat CEO/super-admin
 * tahrirlay/tayinlay oladi — `RolesService`dagi tekshiruv 3-4-bosqichlarda
 * ulanadi.
 */
export class RolesPrivilegedTier1790500000000 implements MigrationInterface {
  name = 'RolesPrivilegedTier1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_privileged" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'roles.manage-privileged', 'roles', 'manage-privileged')
       ON CONFLICT ("code") DO NOTHING`,
    );

    await queryRunner.query(
      `UPDATE "roles" SET "is_privileged" = true
       WHERE "name" = 'director' AND "school_id" IS NULL AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = 'roles.manage-privileged')`,
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = 'roles.manage-privileged'`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "is_privileged"`);
  }
}
