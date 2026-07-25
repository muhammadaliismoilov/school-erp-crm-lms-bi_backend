import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Davomat tizimi poydevori (Bosqich A):
 *  - `attendance_records` va `staff_attendance_records` status enumlariga
 *    `left_early` (erta ketdi) qiymatini qo'shadi;
 *  - `timetable_slots` ga `session_type` (lesson/course) ustunini qo'shadi;
 *  - `attendance_settings` jadvalini yaratadi (filial bo'yicha siyosat).
 */
export class AttendanceSessionFoundation1788200000000 implements MigrationInterface {
  name = 'AttendanceSessionFoundation1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Status enumlariga yangi qiymat (ikkala jadval alohida enum turiga ega).
    await queryRunner.query(
      `ALTER TYPE "public"."attendance_records_status_enum" ADD VALUE IF NOT EXISTS 'left_early'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."staff_attendance_records_status_enum" ADD VALUE IF NOT EXISTS 'left_early'`,
    );

    // 2) Sessiya turi enumi + timetable_slots ustuni.
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "timetable_slots_session_type_enum" AS ENUM ('lesson', 'course');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "timetable_slots" ADD COLUMN IF NOT EXISTS "session_type"
         "timetable_slots_session_type_enum" NOT NULL DEFAULT 'lesson'`,
    );

    // 3) Davomat sozlamalari jadvali.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "late_threshold_minutes" integer NOT NULL DEFAULT 5,
        "correction_window_minutes" integer NOT NULL DEFAULT 720,
        "notify_on_entry" boolean NOT NULL DEFAULT true,
        "notify_on_exit" boolean NOT NULL DEFAULT true,
        "notify_on_session" boolean NOT NULL DEFAULT true,
        "quiet_hours_start" time,
        "quiet_hours_end" time,
        CONSTRAINT "pk_attendance_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_attendance_settings_scope"
         ON "attendance_settings" ("school_id", "filial_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_settings"`);
    await queryRunner.query(`ALTER TABLE "timetable_slots" DROP COLUMN IF EXISTS "session_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "timetable_slots_session_type_enum"`);
    // Eslatma: Postgres enum qiymatini xavfsiz o'chirib bo'lmaydi; `left_early`
    // qiymati enumda qoladi (down zararsiz).
  }
}
