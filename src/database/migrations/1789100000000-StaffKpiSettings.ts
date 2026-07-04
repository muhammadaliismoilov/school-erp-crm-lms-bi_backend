import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Har-xodim KPI sozlamasi (5c): `hr_staff_members.kpi_mode` (percent|fixed,
 * null — KPI yo'q) va `kpi_value`. `hr-staff-kpi.update` ruxsati faqat
 * hr.manage soyaboniga ulanadi (HR/direktor/egasi/superadmin).
 */
export class StaffKpiSettings1789100000000 implements MigrationInterface {
  name = 'StaffKpiSettings1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_staff_members_kpi_mode_enum" AS ENUM ('percent', 'fixed');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr_staff_members"
         ADD COLUMN IF NOT EXISTS "kpi_mode" "hr_staff_members_kpi_mode_enum",
         ADD COLUMN IF NOT EXISTS "kpi_value" numeric(14,2) NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'hr-staff-kpi.update', 'hr-staff-kpi', 'update')
       ON CONFLICT ("code") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'hr.manage'
       JOIN "permissions" p ON p.code = 'hr-staff-kpi.update'
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = 'hr-staff-kpi.update')`,
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = 'hr-staff-kpi.update'`);
    await queryRunner.query(
      `ALTER TABLE "hr_staff_members" DROP COLUMN IF EXISTS "kpi_mode", DROP COLUMN IF EXISTS "kpi_value"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_members_kpi_mode_enum"`);
  }
}
