import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Maoshlar" (O'qituvchi maoshlari) moduli:
 *  - `teacher_lesson_rates` — o'qituvchi uchun akademik yil bo'yicha dars stavkasi.
 *  - `teacher_salaries` — o'qituvchining oylik maoshi (yakunlangan darslar asosida
 *    hisoblangan, qo'lda tuzatiladigan va tasdiqlanadigan).
 *  - Tasdiqlash uchun "Maosh" chiqim kategoriyasini seed qiladi (mavjud bo'lmasa).
 */
export class TeacherSalaries1783000000000 implements MigrationInterface {
  name = 'TeacherSalaries1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── teacher_lesson_rates ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teacher_lesson_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "teacher_id" uuid NOT NULL,
        "academic_year_id" uuid NOT NULL,
        "rate_per_lesson" numeric(14,2) NOT NULL DEFAULT 0,
        CONSTRAINT "pk_teacher_lesson_rates" PRIMARY KEY ("id"),
        CONSTRAINT "fk_teacher_lesson_rates_teacher" FOREIGN KEY ("teacher_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_teacher_lesson_rates_year" FOREIGN KEY ("academic_year_id")
          REFERENCES "academic_years"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_teacher_lesson_rates_teacher_year"
       ON "teacher_lesson_rates" ("teacher_id", "academic_year_id")`,
    );

    // ─── teacher_salaries ─────────────────────────────────────────────────
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "teacher_salaries_status_enum" AS ENUM ('pending', 'approved');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teacher_salaries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "teacher_id" uuid NOT NULL,
        "academic_year_id" uuid,
        "period" varchar(7) NOT NULL,
        "completed_lessons" integer NOT NULL DEFAULT 0,
        "rate_per_lesson" numeric(14,2) NOT NULL DEFAULT 0,
        "computed_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "adjusted_lessons" integer,
        "adjusted_amount" numeric(14,2),
        "final_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "adjustment_reason" text,
        "status" "teacher_salaries_status_enum" NOT NULL DEFAULT 'pending',
        "approved_at" TIMESTAMPTZ,
        "approved_by" uuid,
        "approved_by_name" varchar(160),
        "transaction_id" uuid,
        CONSTRAINT "pk_teacher_salaries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_teacher_salaries_teacher" FOREIGN KEY ("teacher_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_teacher_salaries_year" FOREIGN KEY ("academic_year_id")
          REFERENCES "academic_years"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_teacher_salaries_teacher_period"
       ON "teacher_salaries" ("teacher_id", "period")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_teacher_salaries_period" ON "teacher_salaries" ("period")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_teacher_salaries_status" ON "teacher_salaries" ("status")`,
    );

    // ─── "Maosh" chiqim kategoriyasini seed qilish ─────────────────────────
    await queryRunner.query(
      `INSERT INTO "transaction_categories" ("name", "kind", "is_student_tuition", "is_system", "sort_order")
       SELECT 'Maosh', 'expense'::"transaction_categories_kind_enum", false, true, 50
       WHERE NOT EXISTS (SELECT 1 FROM "transaction_categories" WHERE "name" = 'Maosh')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "teacher_salaries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "teacher_salaries_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teacher_lesson_rates"`);
  }
}
