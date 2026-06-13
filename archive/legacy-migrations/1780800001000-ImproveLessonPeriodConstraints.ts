import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ImproveLessonPeriodConstraints1780800001000 implements MigrationInterface {
  name = 'ImproveLessonPeriodConstraints1780800001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "uq_lesson_periods_code"');
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_periods_code_active"
      ON "lesson_periods" ("code")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_periods_order_active"
      ON "lesson_periods" ("sort_order")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "uq_lesson_periods_order_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_lesson_periods_code_active"');
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_periods_code"
      ON "lesson_periods" ("code")
    `);
  }
}
