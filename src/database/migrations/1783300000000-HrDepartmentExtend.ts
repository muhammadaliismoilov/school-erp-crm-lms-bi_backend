import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Bo'limlar" kengaytmasi: `hr_departments` ga filial (branch), ota bo'lim
 * (parent), Telegram chat ID va holat (status) maydonlarini qo'shadi.
 */
export class HrDepartmentExtend1783300000000 implements MigrationInterface {
  name = 'HrDepartmentExtend1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "hr_departments_status_enum" AS ENUM ('active', 'inactive');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      ALTER TABLE "hr_departments"
        ADD COLUMN IF NOT EXISTS "filial_id" uuid,
        ADD COLUMN IF NOT EXISTS "parent_id" uuid,
        ADD COLUMN IF NOT EXISTS "telegram_chat_id" varchar(64),
        ADD COLUMN IF NOT EXISTS "status" "hr_departments_status_enum" NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_departments"
          ADD CONSTRAINT "fk_hr_departments_filial" FOREIGN KEY ("filial_id")
          REFERENCES "branches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_departments"
          ADD CONSTRAINT "fk_hr_departments_parent" FOREIGN KEY ("parent_id")
          REFERENCES "hr_departments"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_departments_filial" ON "hr_departments" ("filial_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_departments_parent" ON "hr_departments" ("parent_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_departments" DROP CONSTRAINT IF EXISTS "fk_hr_departments_filial"`);
    await queryRunner.query(`ALTER TABLE "hr_departments" DROP CONSTRAINT IF EXISTS "fk_hr_departments_parent"`);
    await queryRunner.query(`
      ALTER TABLE "hr_departments"
        DROP COLUMN IF EXISTS "filial_id",
        DROP COLUMN IF EXISTS "parent_id",
        DROP COLUMN IF EXISTS "telegram_chat_id",
        DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_departments_status_enum"`);
  }
}
