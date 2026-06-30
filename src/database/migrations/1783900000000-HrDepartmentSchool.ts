import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Bo'limlar" — bo'lim egasini kengaytirish: `hr_departments` ga `school_id`
 * qo'shadi. Bo'lim endi yo asosiy maktab (bosh ofis) yoki filialga tegishli
 * bo'lishi mumkin.
 */
export class HrDepartmentSchool1783900000000 implements MigrationInterface {
  name = 'HrDepartmentSchool1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_departments" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_departments"
          ADD CONSTRAINT "fk_hr_departments_school" FOREIGN KEY ("school_id")
          REFERENCES "schools"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_departments_school" ON "hr_departments" ("school_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_departments" DROP CONSTRAINT IF EXISTS "fk_hr_departments_school"`);
    await queryRunner.query(`ALTER TABLE "hr_departments" DROP COLUMN IF EXISTS "school_id"`);
  }
}
