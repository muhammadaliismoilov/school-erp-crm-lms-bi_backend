import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sessiya xavfsizligi (S1): `user_sessions.last_seen_at` (Qurilmalar
 * sahifasida "faol: 5 daq oldin") + foydalanuvchining faol sessiyalarini
 * tez topish uchun indeks (jonlik tekshiruvi va ro'yxat so'rovlari).
 */
export class SessionLastSeen1789400000000 implements MigrationInterface {
  name = 'SessionLastSeen1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_active"
         ON "user_sessions" ("user_id")
         WHERE "revoked_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_sessions_user_active"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "last_seen_at"`);
  }
}
