import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — 2-bosqich (StaffMember namunasi).
 * `hr_staff_members`ga `school_id` (qattiq tenant chegarasi) va `filial_id`
 * (branch) qo'shadi. Yangi xodimlar so'rov kontekstidagi maktab/filial bilan
 * yoziladi, ro'yxat/karta so'rovlari esa avtomatik shu bo'yicha filtrlanadi.
 *
 * Nullable — eski yozuvlar buzilmasin. Ular backfill bosqichida biriktiriladi;
 * ungacha kontekst (yoki school_id) `null` bo'lsa filtr qo'llanmaydi.
 */
export class HrStaffSchoolBranch1785800000000 implements MigrationInterface {
  name = 'HrStaffSchoolBranch1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_staff_members" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
    await queryRunner.query(`ALTER TABLE "hr_staff_members" ADD COLUMN IF NOT EXISTS "filial_id" uuid`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_staff_members" ADD CONSTRAINT "fk_hr_staff_school"
          FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_staff_members" ADD CONSTRAINT "fk_hr_staff_filial"
          FOREIGN KEY ("filial_id") REFERENCES "branches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_staff_school" ON "hr_staff_members" ("school_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_staff_filial" ON "hr_staff_members" ("filial_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_hr_staff_filial"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_hr_staff_school"`);
    await queryRunner.query(`ALTER TABLE "hr_staff_members" DROP CONSTRAINT IF EXISTS "fk_hr_staff_filial"`);
    await queryRunner.query(`ALTER TABLE "hr_staff_members" DROP CONSTRAINT IF EXISTS "fk_hr_staff_school"`);
    await queryRunner.query(`ALTER TABLE "hr_staff_members" DROP COLUMN IF EXISTS "filial_id"`);
    await queryRunner.query(`ALTER TABLE "hr_staff_members" DROP COLUMN IF EXISTS "school_id"`);
  }
}
