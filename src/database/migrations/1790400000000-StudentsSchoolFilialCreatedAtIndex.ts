import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `GET /students` sahifalash (`skip/take` + `leftJoinAndSelect`) TypeORM'ni
 * "split pagination"ga majburlaydi: birinchi (ID tanlovchi) so'rov
 * `ORDER BY created_at DESC`ni tenant-filtrlangan qatorlar ustida indekssiz
 * bajarardi. `CONCURRENTLY` — production'da jadval bloklanmasin (shu sabab
 * migratsiya tranzaksiyasiz, pastdagi `transaction = false`).
 */
export class StudentsSchoolFilialCreatedAtIndex1790400000000 implements MigrationInterface {
  name = 'StudentsSchoolFilialCreatedAtIndex1790400000000';
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_students_school_filial_created" ON "students" ("school_id", "filial_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_students_school_filial_created"`);
  }
}
