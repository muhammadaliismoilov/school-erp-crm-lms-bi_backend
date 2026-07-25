import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LessonScheduleTimetable1781900000000 implements MigrationInterface {
  name = 'LessonScheduleTimetable1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" ADD "original_teacher_id" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "lms_lesson_schedules" ADD "course_id" uuid`);
    await queryRunner.query(`ALTER TABLE "lms_lesson_schedules" ADD "quarter_id" uuid`);
    await queryRunner.query(`ALTER TABLE "lms_lesson_schedules" ADD "weekday" smallint`);

    // Mavjud darslar uchun weekday ni lesson_date dan to'ldirish (ISO: 1=Dushanba … 7=Yakshanba).
    await queryRunner.query(
      `UPDATE "lms_lesson_schedules" SET "weekday" = EXTRACT(ISODOW FROM "lesson_date")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_lms_lessons_quarter" ON "lms_lesson_schedules" ("quarter_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_lms_lessons_weekday" ON "lms_lesson_schedules" ("weekday")`,
    );

    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" ADD CONSTRAINT "FK_lms_lessons_original_teacher" ` +
        `FOREIGN KEY ("original_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" ADD CONSTRAINT "FK_lms_lessons_course" ` +
        `FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" ADD CONSTRAINT "FK_lms_lessons_quarter" ` +
        `FOREIGN KEY ("quarter_id") REFERENCES "quarters"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" DROP CONSTRAINT "FK_lms_lessons_quarter"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" DROP CONSTRAINT "FK_lms_lessons_course"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" DROP CONSTRAINT "FK_lms_lessons_original_teacher"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_lms_lessons_weekday"`);
    await queryRunner.query(`DROP INDEX "public"."idx_lms_lessons_quarter"`);
    await queryRunner.query(`ALTER TABLE "lms_lesson_schedules" DROP COLUMN "weekday"`);
    await queryRunner.query(`ALTER TABLE "lms_lesson_schedules" DROP COLUMN "quarter_id"`);
    await queryRunner.query(`ALTER TABLE "lms_lesson_schedules" DROP COLUMN "course_id"`);
    await queryRunner.query(
      `ALTER TABLE "lms_lesson_schedules" DROP COLUMN "original_teacher_id"`,
    );
  }
}
