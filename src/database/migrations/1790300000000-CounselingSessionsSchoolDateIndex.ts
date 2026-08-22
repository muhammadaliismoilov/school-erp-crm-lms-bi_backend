import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `GET /counseling/sessions` — `ORDER BY session_date DESC` (maktab bo'yicha
 * filtrlangan) hech qanday indeksga tayanmagan edi, shu sababli har chaqiriqda
 * to'liq indekssiz saralash bajarilardi. `CONCURRENTLY` — production'da jadval
 * bloklanmasin (shu sabab migratsiya tranzaksiyasiz ishlaydi, pastdagi
 * `transaction = false`).
 */
export class CounselingSessionsSchoolDateIndex1790300000000 implements MigrationInterface {
  name = 'CounselingSessionsSchoolDateIndex1790300000000';
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_counseling_sessions_school_date" ON "counseling_sessions" ("school_id", "session_date" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_counseling_sessions_school_date"`);
  }
}
