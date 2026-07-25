import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — LMS (exams, exam_results, journal_entries,
 * lesson_schedules, quarter_subject_grades). Ustun + FK + indeks + backfill
 * (class/student ota'dan, qolgani Yuton School).
 */
export class LmsTenantScope1786500000000 implements MigrationInterface {
  name = 'LmsTenantScope1786500000000';

  private readonly tables = [
    'lms_exams',
    'lms_exam_results',
    'lms_journal_entries',
    'lms_lesson_schedules',
    'lms_quarter_subject_grades',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.tables) {
      await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
      await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "filial_id" uuid`);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${t}" ADD CONSTRAINT "fk_${t}_school"
            FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN null; END $$
      `);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${t}" ADD CONSTRAINT "fk_${t}_filial"
            FOREIGN KEY ("filial_id") REFERENCES "branches"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN null; END $$
      `);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_${t}_school" ON "${t}" ("school_id")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_${t}_filial" ON "${t}" ("filial_id")`);
    }

    await queryRunner.query(`UPDATE "lms_exams" e SET "school_id"=c."school_id", "filial_id"=c."filial_id" FROM "classes" c WHERE e."class_id"=c."id" AND e."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "lms_lesson_schedules" l SET "school_id"=c."school_id", "filial_id"=c."filial_id" FROM "classes" c WHERE l."class_id"=c."id" AND l."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "lms_exam_results" r SET "school_id"=s."school_id", "filial_id"=s."filial_id" FROM "students" s WHERE r."student_id"=s."id" AND r."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "lms_journal_entries" j SET "school_id"=s."school_id", "filial_id"=s."filial_id" FROM "students" s WHERE j."student_id"=s."id" AND j."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "lms_quarter_subject_grades" g SET "school_id"=s."school_id", "filial_id"=s."filial_id" FROM "students" s WHERE g."student_id"=s."id" AND g."school_id" IS NULL`);

    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    if (rows[0]?.id) {
      for (const t of this.tables) {
        await queryRunner.query(`UPDATE "${t}" SET "school_id" = $1 WHERE "school_id" IS NULL`, [rows[0].id]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${t}_filial"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${t}_school"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "fk_${t}_filial"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "fk_${t}_school"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "filial_id"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "school_id"`);
    }
  }
}
