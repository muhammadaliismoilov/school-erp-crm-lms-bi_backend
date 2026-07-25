import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Xodimlar" kengaytmasi:
 *  - `hr_staff_members` ga shaxsiy maydonlar qo'shadi (kirill ism-sharif,
 *    otasining ismi, jins, tug'ilgan sana, pasport seriyasi, JShShIR).
 *  - `hr_staff_salary_history` jadvalini yaratadi (maosh o'zgarishlar tarixi).
 */
export class HrStaffExtend1783200000000 implements MigrationInterface {
  name = 'HrStaffExtend1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "hr_staff_members_gender_enum" AS ENUM ('male', 'female');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      ALTER TABLE "hr_staff_members"
        ADD COLUMN IF NOT EXISTS "first_name_cyrillic" varchar(80),
        ADD COLUMN IF NOT EXISTS "last_name_cyrillic" varchar(80),
        ADD COLUMN IF NOT EXISTS "middle_name" varchar(80),
        ADD COLUMN IF NOT EXISTS "middle_name_cyrillic" varchar(80),
        ADD COLUMN IF NOT EXISTS "gender" "hr_staff_members_gender_enum",
        ADD COLUMN IF NOT EXISTS "birth_date" date,
        ADD COLUMN IF NOT EXISTS "passport_series" varchar(32),
        ADD COLUMN IF NOT EXISTS "pinfl" varchar(14)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_staff_salary_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid NOT NULL,
        "old_salary" numeric(14,2),
        "new_salary" numeric(14,2) NOT NULL,
        "reason" text,
        "changed_by_id" uuid,
        "changed_by_name" varchar(160),
        CONSTRAINT "pk_hr_staff_salary_history" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_salary_history_staff" FOREIGN KEY ("staff_member_id")
          REFERENCES "hr_staff_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_salary_history_staff" ON "hr_staff_salary_history" ("staff_member_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_staff_salary_history"`);
    await queryRunner.query(`
      ALTER TABLE "hr_staff_members"
        DROP COLUMN IF EXISTS "first_name_cyrillic",
        DROP COLUMN IF EXISTS "last_name_cyrillic",
        DROP COLUMN IF EXISTS "middle_name",
        DROP COLUMN IF EXISTS "middle_name_cyrillic",
        DROP COLUMN IF EXISTS "gender",
        DROP COLUMN IF EXISTS "birth_date",
        DROP COLUMN IF EXISTS "passport_series",
        DROP COLUMN IF EXISTS "pinfl"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_members_gender_enum"`);
  }
}
