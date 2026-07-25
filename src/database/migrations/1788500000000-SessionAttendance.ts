import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dars/kurs sessiyalari va sessiya davomati (Bosqich C):
 *  - `class_sessions` — slotning aniq sanadagi real ko'rinishi (snapshot);
 *  - `session_attendances` — har sessiya × har o'quvchi davomati;
 *  - `session_attendance_audits` — har tuzatishning o'zgarmas izi.
 */
export class SessionAttendance1788500000000 implements MigrationInterface {
  name = 'SessionAttendance1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum turlari.
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "session_status_enum" AS ENUM ('scheduled','open','confirmed','cancelled');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "session_kind_enum" AS ENUM ('lesson','course');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "session_source_enum" AS ENUM ('auto','manual');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "attendance_status_full_enum" AS ENUM ('present','absent','late','excused','left_early');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    // class_sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "class_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "slot_id" uuid,
        "date" date NOT NULL,
        "class_id" uuid NOT NULL,
        "subject_id" uuid NOT NULL,
        "teacher_id" uuid NOT NULL,
        "session_type" "session_kind_enum" NOT NULL DEFAULT 'lesson',
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "status" "session_status_enum" NOT NULL DEFAULT 'scheduled',
        "confirmed_by_teacher_id" uuid,
        "confirmed_at" TIMESTAMPTZ,
        CONSTRAINT "pk_class_sessions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_class_sessions_slot_date" ON "class_sessions" ("slot_id", "date")
         WHERE "slot_id" IS NOT NULL AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_class_sessions_class_date" ON "class_sessions" ("class_id", "date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_class_sessions_teacher_date" ON "class_sessions" ("teacher_id", "date")`);

    // session_attendances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session_attendances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "session_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "status" "attendance_status_full_enum" NOT NULL,
        "minutes_late" integer,
        "source" "session_source_enum" NOT NULL DEFAULT 'auto',
        "note" varchar(255),
        CONSTRAINT "pk_session_attendances" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "session_attendances" ADD CONSTRAINT "fk_session_attendances_session"
          FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_session_attendance_session_student" ON "session_attendances" ("session_id", "student_id")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_session_attendance_student" ON "session_attendances" ("student_id")`);

    // session_attendance_audits
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session_attendance_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "attendance_id" uuid NOT NULL,
        "changed_by_user_id" uuid,
        "old_status" "attendance_status_full_enum",
        "new_status" "attendance_status_full_enum" NOT NULL,
        "old_minutes_late" integer,
        "new_minutes_late" integer,
        "reason" varchar(255),
        CONSTRAINT "pk_session_attendance_audits" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_session_attendance_audit_attendance" ON "session_attendance_audits" ("attendance_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "session_attendance_audits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "session_attendances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_sessions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendance_status_full_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "session_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "session_kind_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "session_status_enum"`);
  }
}
