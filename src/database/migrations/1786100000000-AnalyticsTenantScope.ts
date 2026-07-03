import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — pul o'qiydigan analitik jadvallar: `student_payments`,
 * `teacher_salaries`, `teacher_lesson_rates`ga `school_id`+`filial_id` qo'shadi
 * (FK + indekslar) va mavjud yozuvlarni "Yuton School"ga backfill qiladi.
 */
export class AnalyticsTenantScope1786100000000 implements MigrationInterface {
  name = 'AnalyticsTenantScope1786100000000';

  private readonly tables = ['student_payments', 'teacher_salaries', 'teacher_lesson_rates'];

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

    // Backfill — mavjud yozuvlar asosiy maktab (Yuton School)ga.
    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    const schoolId = rows[0]?.id;
    if (schoolId) {
      for (const t of this.tables) {
        await queryRunner.query(`UPDATE "${t}" SET "school_id" = $1 WHERE "school_id" IS NULL`, [schoolId]);
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
