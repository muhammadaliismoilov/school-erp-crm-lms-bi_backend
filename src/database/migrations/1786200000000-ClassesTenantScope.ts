import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — sinflar (`classes`)ga `school_id`+`filial_id` qo'shadi
 * (FK + indekslar) va mavjud sinflarni "Yuton School"ga backfill qiladi.
 */
export class ClassesTenantScope1786200000000 implements MigrationInterface {
  name = 'ClassesTenantScope1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
    await queryRunner.query(`ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "filial_id" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "classes" ADD CONSTRAINT "fk_classes_school"
          FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "classes" ADD CONSTRAINT "fk_classes_filial"
          FOREIGN KEY ("filial_id") REFERENCES "branches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_classes_school" ON "classes" ("school_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_classes_filial" ON "classes" ("filial_id")`);

    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    if (rows[0]?.id) {
      await queryRunner.query(`UPDATE "classes" SET "school_id" = $1 WHERE "school_id" IS NULL`, [rows[0].id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_classes_filial"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_classes_school"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "fk_classes_filial"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "fk_classes_school"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN IF EXISTS "filial_id"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN IF EXISTS "school_id"`);
  }
}
