import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Lavozimlar" kengaytmasi: `hr_positions` ga tavsif, bo'lim (department),
 * filial (branch) va holat (status) maydonlarini qo'shadi.
 */
export class HrPositionExtend1783500000000 implements MigrationInterface {
  name = 'HrPositionExtend1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "hr_positions_status_enum" AS ENUM ('active', 'inactive');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      ALTER TABLE "hr_positions"
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "department_id" uuid,
        ADD COLUMN IF NOT EXISTS "filial_id" uuid,
        ADD COLUMN IF NOT EXISTS "status" "hr_positions_status_enum" NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_positions"
          ADD CONSTRAINT "fk_hr_positions_department" FOREIGN KEY ("department_id")
          REFERENCES "hr_departments"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_positions"
          ADD CONSTRAINT "fk_hr_positions_filial" FOREIGN KEY ("filial_id")
          REFERENCES "branches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_positions_department" ON "hr_positions" ("department_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_positions_filial" ON "hr_positions" ("filial_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_positions" DROP CONSTRAINT IF EXISTS "fk_hr_positions_department"`);
    await queryRunner.query(`ALTER TABLE "hr_positions" DROP CONSTRAINT IF EXISTS "fk_hr_positions_filial"`);
    await queryRunner.query(`
      ALTER TABLE "hr_positions"
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "department_id",
        DROP COLUMN IF EXISTS "filial_id",
        DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_positions_status_enum"`);
  }
}
