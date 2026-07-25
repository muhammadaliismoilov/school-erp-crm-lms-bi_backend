import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * O'qituvchi mutaxassislik fanlari + jadval o'qituvchisi manbasini User → HR Teacher.
 *
 * 1) `hr_teacher_subjects` — o'qituvchi ↔ fan ko'p-ko'pga (qaysi fandan dars beradi).
 * 2) `lms_lesson_schedules.teacher_id` / `original_teacher_id` FK: users → hr_teachers.
 *    Mavjud (User asosidagi) qiymatlar hr_teachers'da yo'q — NULL qilinadi (qayta seed).
 */
export class TeacherSubjectsScheduleFk1789700000000 implements MigrationInterface {
  name = 'TeacherSubjectsScheduleFk1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Bog'lovchi jadval: o'qituvchi ↔ fan.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_teacher_subjects" (
        "teacher_id" uuid NOT NULL,
        "subject_id" uuid NOT NULL,
        CONSTRAINT "pk_hr_teacher_subjects" PRIMARY KEY ("teacher_id", "subject_id"),
        CONSTRAINT "fk_hr_teacher_subjects_teacher" FOREIGN KEY ("teacher_id")
          REFERENCES "hr_teachers" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_hr_teacher_subjects_subject" FOREIGN KEY ("subject_id")
          REFERENCES "subjects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_teacher_subjects_subject" ON "hr_teacher_subjects" ("subject_id")`,
    );

    // 2) Jadval o'qituvchi FK'sini User → HR Teacher'ga o'zgartirish.
    // Avval teacher_id/original_teacher_id ustunlaridagi eski FK'larni dinamik topib o'chiramiz.
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT DISTINCT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'lms_lesson_schedules'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name IN ('teacher_id', 'original_teacher_id')
        LOOP
          EXECUTE 'ALTER TABLE "lms_lesson_schedules" DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);

    // hr_teachers'da mavjud bo'lmagan (User asosidagi) qiymatlarni NULL qilamiz.
    await queryRunner.query(`
      UPDATE "lms_lesson_schedules"
      SET "teacher_id" = NULL
      WHERE "teacher_id" IS NOT NULL
        AND "teacher_id" NOT IN (SELECT "id" FROM "hr_teachers")
    `);
    await queryRunner.query(`
      UPDATE "lms_lesson_schedules"
      SET "original_teacher_id" = NULL
      WHERE "original_teacher_id" IS NOT NULL
        AND "original_teacher_id" NOT IN (SELECT "id" FROM "hr_teachers")
    `);

    // Yangi FK'lar — hr_teachers.
    await queryRunner.query(`
      ALTER TABLE "lms_lesson_schedules"
      ADD CONSTRAINT "fk_lms_lessons_teacher" FOREIGN KEY ("teacher_id")
        REFERENCES "hr_teachers" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "lms_lesson_schedules"
      ADD CONSTRAINT "fk_lms_lessons_original_teacher" FOREIGN KEY ("original_teacher_id")
        REFERENCES "hr_teachers" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" DROP CONSTRAINT IF EXISTS "fk_lms_lessons_teacher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" DROP CONSTRAINT IF EXISTS "fk_lms_lessons_original_teacher"`,
    );
    // Qiymatlarni NULL qilamiz (users FK'sini qayta tiklamaymiz — ma'lumot mos kelmaydi).
    await queryRunner.query(
      `UPDATE "lms_lesson_schedules" SET "teacher_id" = NULL, "original_teacher_id" = NULL`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_teacher_subjects"`);
  }
}
