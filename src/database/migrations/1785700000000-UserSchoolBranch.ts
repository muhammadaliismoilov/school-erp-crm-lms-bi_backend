import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli / ko'p-filialli ajratish — 1-bosqich (poydevor).
 * `users` jadvaliga `school_id` (qattiq tenant chegarasi) va `branch_id`
 * (asosiy filial) qo'shadi. Qiymatlar autentifikatsiyada JWT'ga yoziladi va
 * so'rov kontekstiga (AsyncLocalStorage) uzatiladi.
 *
 * Ustunlar hozircha `nullable` — eski foydalanuvchilar buzilmasligi uchun.
 * Ma'lumot bo'yicha ajratish (entity'larga school_id/filial_id) keyingi
 * bosqichlarda qo'shiladi; backfill esa alohida bosqichda bajariladi.
 */
export class UserSchoolBranch1785700000000 implements MigrationInterface {
  name = 'UserSchoolBranch1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch_id" uuid`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ADD CONSTRAINT "fk_users_school"
          FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ADD CONSTRAINT "fk_users_branch"
          FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_school" ON "users" ("school_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_branch" ON "users" ("branch_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_branch"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_school"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_branch"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_school"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "branch_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "school_id"`);
  }
}
