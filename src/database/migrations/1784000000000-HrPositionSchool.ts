import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Lavozimlar" — lavozim egasini kengaytirish: `hr_positions` ga `school_id`
 * qo'shadi. Lavozim endi yo asosiy maktab (bosh ofis) yoki filialga tegishli.
 */
export class HrPositionSchool1784000000000 implements MigrationInterface {
  name = 'HrPositionSchool1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_positions" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_positions"
          ADD CONSTRAINT "fk_hr_positions_school" FOREIGN KEY ("school_id")
          REFERENCES "schools"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_positions_school" ON "hr_positions" ("school_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_positions" DROP CONSTRAINT IF EXISTS "fk_hr_positions_school"`);
    await queryRunner.query(`ALTER TABLE "hr_positions" DROP COLUMN IF EXISTS "school_id"`);
  }
}
