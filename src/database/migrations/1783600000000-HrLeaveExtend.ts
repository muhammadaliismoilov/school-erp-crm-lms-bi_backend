import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Ta'tillar" kengaytmasi: `hr_staff_leaves` ga ta'til turi (type) va kunlar
 * (days) maydonlarini qo'shadi; `reason` ni ixtiyoriy qiladi.
 */
export class HrLeaveExtend1783600000000 implements MigrationInterface {
  name = 'HrLeaveExtend1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "hr_staff_leaves_type_enum" AS ENUM
           ('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'study', 'other');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      ALTER TABLE "hr_staff_leaves"
        ADD COLUMN IF NOT EXISTS "type" "hr_staff_leaves_type_enum" NOT NULL DEFAULT 'annual',
        ADD COLUMN IF NOT EXISTS "days" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`ALTER TABLE "hr_staff_leaves" ALTER COLUMN "reason" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "hr_staff_leaves" ALTER COLUMN "reason" TYPE varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hr_staff_leaves"
        DROP COLUMN IF EXISTS "type",
        DROP COLUMN IF EXISTS "days"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_leaves_type_enum"`);
  }
}
