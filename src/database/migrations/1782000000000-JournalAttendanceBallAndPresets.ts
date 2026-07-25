import type { MigrationInterface, QueryRunner } from 'typeorm';

export class JournalAttendanceBallAndPresets1782000000000 implements MigrationInterface {
  name = 'JournalAttendanceBallAndPresets1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) lms_journal_entries: ball + attendance
    await queryRunner.query(`ALTER TABLE "lms_journal_entries" ADD "ball" smallint`);
    await queryRunner.query(
      `CREATE TYPE "public"."lms_journal_entries_attendance_enum" AS ENUM('present', 'absent', 'late', 'excused')`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_journal_entries" ADD "attendance" "public"."lms_journal_entries_attendance_enum"`,
    );

    // 2) lms_quarter_subject_grades
    await queryRunner.query(
      `CREATE TABLE "lms_quarter_subject_grades" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMP WITH TIME ZONE, ` +
        `"version" integer NOT NULL, ` +
        `"student_id" uuid NOT NULL, ` +
        `"subject_id" uuid NOT NULL, ` +
        `"quarter_id" uuid NOT NULL, ` +
        `"grade" smallint, ` +
        `"ball" smallint, ` +
        `"comment" text, ` +
        `CONSTRAINT "PK_lms_quarter_subject_grades" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_lms_qsg_student_subject_quarter" ON "lms_quarter_subject_grades" ` +
        `("student_id", "subject_id", "quarter_id") WHERE deleted_at IS NULL`,
    );
    for (const [col, ref] of [
      ['student_id', 'students'],
      ['subject_id', 'subjects'],
      ['quarter_id', 'quarters'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE "lms_quarter_subject_grades" ADD CONSTRAINT "FK_lms_qsg_${col}" ` +
          `FOREIGN KEY ("${col}") REFERENCES "${ref}"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // 3) coin_presets + default seed
    await queryRunner.query(
      `CREATE TABLE "coin_presets" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMP WITH TIME ZONE, ` +
        `"version" integer NOT NULL, ` +
        `"name" character varying(120) NOT NULL, ` +
        `"amount" integer NOT NULL, ` +
        `"icon" character varying(64), ` +
        `"color" character varying(9), ` +
        `"sort_order" integer NOT NULL DEFAULT 0, ` +
        `"is_active" boolean NOT NULL DEFAULT true, ` +
        `CONSTRAINT "PK_coin_presets" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coin_presets_active" ON "coin_presets" ("is_active")`,
    );
    await queryRunner.query(
      `INSERT INTO "coin_presets" ("version", "name", "amount", "color", "sort_order") VALUES ` +
        `(1, 'Mehnat', 1000, '#22C55E', 1), ` +
        `(1, 'Vatan', 5000, '#3B82F6', 2), ` +
        `(1, 'Topildiq', 10000, '#F59E0B', 3), ` +
        `(1, 'Sovrin', 25000, '#EF4444', 4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "coin_presets"`);
    for (const col of ['student_id', 'subject_id', 'quarter_id']) {
      await queryRunner.query(
        `ALTER TABLE "lms_quarter_subject_grades" DROP CONSTRAINT "FK_lms_qsg_${col}"`,
      );
    }
    await queryRunner.query(`DROP TABLE "lms_quarter_subject_grades"`);
    await queryRunner.query(`ALTER TABLE "lms_journal_entries" DROP COLUMN "attendance"`);
    await queryRunner.query(`DROP TYPE "public"."lms_journal_entries_attendance_enum"`);
    await queryRunner.query(`ALTER TABLE "lms_journal_entries" DROP COLUMN "ball"`);
  }
}
