import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `users.workplace` ustunini qo‘shadi — asosan ota-onalar uchun ish joyi.
 * Ota-onalar ro‘yxatida "ISH JOYI" ustunida ko‘rsatiladi.
 */
export class UserWorkplace1782500000000 implements MigrationInterface {
  name = 'UserWorkplace1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "workplace" character varying(160)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "workplace"`,
    );
  }
}
