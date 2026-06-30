import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "O'qituvchilar ro'yxati" moduli: `hr_teachers` jadvalini yaratadi.
 * O'qituvchiga xos shaxsiy + ish + qo'shimcha (rollar) ma'lumotlarini saqlaydi.
 */
export class HrTeachers1784300000000 implements MigrationInterface {
  name = 'HrTeachers1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_gender_enum" AS ENUM ('male', 'female');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_work_type_enum" AS ENUM ('full', 'hourly');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_degree_enum" AS ENUM
         ('secondary_special', 'bachelor', 'master', 'phd', 'doctor');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_employment_type_enum" AS ENUM ('primary', 'secondary');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_status_enum" AS ENUM ('active', 'on_leave', 'dismissed');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_category_enum" AS ENUM ('oliy', 'first', 'second', 'special');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_teachers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid,
        "first_name" varchar(80) NOT NULL,
        "last_name" varchar(80) NOT NULL,
        "middle_name" varchar(80),
        "gender" "hr_teachers_gender_enum",
        "birth_date" date,
        "document_number" varchar(32),
        "pinfl" varchar(14),
        "phone" varchar(20),
        "email" varchar(120),
        "work_type" "hr_teachers_work_type_enum" NOT NULL DEFAULT 'full',
        "degree" "hr_teachers_degree_enum",
        "employment_type" "hr_teachers_employment_type_enum" NOT NULL DEFAULT 'primary',
        "status" "hr_teachers_status_enum" NOT NULL DEFAULT 'active',
        "category" "hr_teachers_category_enum",
        "experience_years" integer NOT NULL DEFAULT 0,
        "rate_per_lesson" numeric(14,2) NOT NULL DEFAULT 0,
        "start_date" date,
        "end_date" date,
        "is_subject_teacher" boolean NOT NULL DEFAULT true,
        "is_assistant_teacher" boolean NOT NULL DEFAULT false,
        "is_mbr" boolean NOT NULL DEFAULT false,
        "is_extra_lesson" boolean NOT NULL DEFAULT false,
        "is_class_leader" boolean NOT NULL DEFAULT false,
        "note" text,
        CONSTRAINT "pk_hr_teachers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_teachers"
          ADD CONSTRAINT "fk_hr_teachers_staff" FOREIGN KEY ("staff_member_id")
          REFERENCES "hr_staff_members"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_teachers_staff" ON "hr_teachers" ("staff_member_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_teachers_status" ON "hr_teachers" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_teachers_category" ON "hr_teachers" ("category")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_teachers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_employment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_degree_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_work_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_gender_enum"`);
  }
}
