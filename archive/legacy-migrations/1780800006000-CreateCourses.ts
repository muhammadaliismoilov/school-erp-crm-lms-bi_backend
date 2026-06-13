import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourses1780800006000 implements MigrationInterface {
  name = 'CreateCourses1780800006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(160) NOT NULL,
        "normalized_name" varchar(160) NOT NULL,
        "quarter_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "room_id" uuid NOT NULL,
        "description" text,
        "subject_id" uuid NOT NULL,
        "teacher_id" uuid NOT NULL,
        "planned_lesson_count" integer NOT NULL DEFAULT 0,
        "completed_lesson_count" integer NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "course_students" (
        "course_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_course_students" PRIMARY KEY ("course_id", "student_id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_courses_quarter_name_active"
      ON "courses" ("quarter_id", "normalized_name")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "idx_courses_quarter" ON "courses" ("quarter_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "idx_courses_subject" ON "courses" ("subject_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "idx_courses_teacher" ON "courses" ("teacher_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "idx_courses_room" ON "courses" ("room_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "idx_courses_status" ON "courses" ("status")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "idx_course_students_student" ON "course_students" ("student_id")');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_dates') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "chk_courses_dates" CHECK ("end_date" >= "start_date");
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_lesson_counts') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "chk_courses_lesson_counts"
          CHECK ("planned_lesson_count" >= 0 AND "completed_lesson_count" >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_status') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "chk_courses_status"
          CHECK ("status" IN ('active', 'inactive', 'archived'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_quarter') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "fk_courses_quarter"
          FOREIGN KEY ("quarter_id") REFERENCES "quarters"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_room') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "fk_courses_room"
          FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_subject') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "fk_courses_subject"
          FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_teacher') THEN
          ALTER TABLE "courses"
          ADD CONSTRAINT "fk_courses_teacher"
          FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_students_course') THEN
          ALTER TABLE "course_students"
          ADD CONSTRAINT "fk_course_students_course"
          FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_students_student') THEN
          ALTER TABLE "course_students"
          ADD CONSTRAINT "fk_course_students_student"
          FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_students" DROP CONSTRAINT IF EXISTS "fk_course_students_student"');
    await queryRunner.query('ALTER TABLE "course_students" DROP CONSTRAINT IF EXISTS "fk_course_students_course"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "fk_courses_teacher"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "fk_courses_subject"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "fk_courses_room"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "fk_courses_quarter"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "chk_courses_status"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "chk_courses_lesson_counts"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "chk_courses_dates"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_course_students_student"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_courses_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_courses_room"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_courses_teacher"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_courses_subject"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_courses_quarter"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_courses_quarter_name_active"');
    await queryRunner.query('DROP TABLE IF EXISTS "course_students"');
    await queryRunner.query('DROP TABLE IF EXISTS "courses"');
  }
}
