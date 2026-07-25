import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — rollarni maktabga bog'lash.
 *
 * `roles.school_id` (nullable) qo'shiladi: NULL — global/tizim rol (super-admin
 * va boshqa umumiy rollar), aks holda rol faqat shu maktab ichida ko'rinadi va
 * boshqariladi. Eski `uq_roles_name` o'rniga ikkita partial-unique indeks:
 * global nomlar orasida bitta, har maktab ichida bitta.
 *
 * Mavjud rollar backfill qilinmaydi — hammasi global bo'lib qoladi (tizim
 * rollari umumiy bo'lishi kerak; maktablar keyin o'z rollarini yaratadi).
 */
export class RolesSchoolScope1786800000000 implements MigrationInterface {
  name = 'RolesSchoolScope1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "roles" ADD CONSTRAINT "fk_roles_school"
          FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_roles_name"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_roles_global_name" ON "roles" ("name")
        WHERE school_id IS NULL AND deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_roles_school_name" ON "roles" ("school_id", "name")
        WHERE school_id IS NOT NULL AND deleted_at IS NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_roles_school" ON "roles" ("school_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_roles_school"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_roles_school_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_roles_global_name"`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_roles_name" ON "roles" ("name")`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "fk_roles_school"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "school_id"`);
  }
}
